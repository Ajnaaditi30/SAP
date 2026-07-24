import ragService from "../server/rag/service.js";

const { decodeWithRag, emptyResponse } = ragService;
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const MAX_INPUT_LENGTH = 4000;
const MIN_INPUT_LENGTH = 4;
const MAX_CACHE_ITEMS = 100;
const FALLBACK_RESULT = "Unable to decode this error right now. Please try again.";

const responseCache = new Map();

const SYSTEM_PROMPT = `You are an expert SAP consultant.
Only give accurate, practical solutions.
If unsure, clearly say low confidence.
Do NOT hallucinate transaction codes.

You are an expert SAP consultant with deep knowledge of SAP FI, MM, SD, ABAP, and Basis modules.

Your job is to decode SAP error messages into clear, structured, and actionable explanations.

Rules:

* Always explain in simple English
* Never be vague
* If unsure, say 'Low confidence'
* Do NOT hallucinate transaction codes unless confident
* Output MUST follow this format:

\u{1F534} Meaning: <clear explanation>

\u{1F4CD} Cause: <root cause in bullet points>

\u{1F527} Fix Steps: <numbered steps>

\u{23F1} Time to Fix: <estimate>

\u{1F464} Who Can Fix: <role>

\u{26A0}\u{FE0F} Risk Level:
<Low / Medium / High>`;

const SENSITIVE_PATTERN = /\b\d{8,}\b|(?:password|passwd|secret|token|api[_-]?key)\s*[:=]|(?:salary|payroll|ssn|social security|credit card|bank account|confidential)/i;
const REQUIRED_SECTIONS = ["Meaning", "Cause", "Fix Steps", "Time to Fix", "Who Can Fix", "Risk Level"];

const isDevelopment = process.env.NODE_ENV === "development";

if (isDevelopment) {
  console.log("[decode] OPENAI_API_KEY configured:", Boolean(process.env.OPENAI_API_KEY));
  console.log("[decode] OPENAI_MODEL:", OPENAI_MODEL);
}

const containsSensitiveData = (value) => SENSITIVE_PATTERN.test(value);

const sanitizeForLog = (value) => {
  return String(value || "")
    .replace(/sk-[A-Za-z0-9_-]+/g, "[redacted-key]")
    .replace(/\b\d{8,}\b/g, "[redacted-number]")
    .slice(0, 160);
};

const getCacheKey = (error) => error.trim().toLowerCase();

const setCache = (key, value) => {
  if (responseCache.size >= MAX_CACHE_ITEMS) {
    const oldestKey = responseCache.keys().next().value;
    responseCache.delete(oldestKey);
  }

  responseCache.set(key, value);
};

const getConfidence = (result) => {
  const normalized = result.toLowerCase();

  if (normalized.includes("low confidence") || normalized.includes("unable to decode")) {
    return "Low";
  }

  if (normalized.includes("medium confidence")) {
    return "Medium";
  }

  if (normalized.includes("high confidence")) {
    return "High";
  }

  const sectionCount = REQUIRED_SECTIONS.filter((section) => (
    normalized.includes(section.toLowerCase())
  )).length;

  if (sectionCount >= 6) return "High";
  if (sectionCount >= 4) return "Medium";
  return "Low";
};

const fallbackResponse = (hasSensitiveData) => ({
  result: FALLBACK_RESULT,
  confidence: "Low",
  hasSensitiveData,
  fromCache: false
});

const assertOpenAIKey = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing API key");
  }
};

const validateErrorInput = (value) => {
  if (typeof value !== "string") {
    return "Error text must be a string.";
  }

  const error = value.trim();

  if (!error) {
    return "Please provide an SAP error to decode.";
  }

  if (error.length < MIN_INPUT_LENGTH) {
    return "Please enter a more complete SAP error message.";
  }

  if (error.length > MAX_INPUT_LENGTH) {
    return `Please keep the SAP error under ${MAX_INPUT_LENGTH} characters.`;
  }

  return null;
};

const validateAIResult = (result) => {
  const trimmed = String(result || "").trim();

  if (trimmed.length < 80) {
    throw new Error("AI response was too short.");
  }

  const sectionCount = REQUIRED_SECTIONS.filter((section) => (
    trimmed.toLowerCase().includes(section.toLowerCase())
  )).length;

  if (sectionCount < 4) {
    throw new Error("AI response did not include enough required sections.");
  }

  if (/^(.)\1{30,}$/.test(trimmed.replace(/\s/g, ""))) {
    throw new Error("AI response looked malformed.");
  }

  return trimmed;
};

const parseOpenAIError = async (response) => {
  try {
    const data = await response.json();
    return data.error?.message || response.statusText || "Unknown OpenAI error";
  } catch {
    return response.statusText || "Unknown OpenAI error";
  }
};

const callOpenAI = async (error) => {
  assertOpenAIKey();

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.2,
      max_tokens: 800,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        {
          role: "user",
          content: `USER INPUT: ${error}`
        }
      ]
    })
  });

  if (!response.ok) {
    const message = await parseOpenAIError(response);
    throw new Error(`OpenAI request failed with status ${response.status}: ${sanitizeForLog(message)}`);
  }

  const data = await response.json();
  const result = data.choices?.[0]?.message?.content;
  const validatedResult = validateAIResult(result);

  console.log("[decode] OpenAI response", {
    model: data.model || OPENAI_MODEL,
    finishReason: data.choices?.[0]?.finish_reason || "unknown",
    outputLength: validatedResult.length,
    usage: data.usage || null
  });

  return validatedResult;
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json(emptyResponse("Method not allowed. Use POST."));
  }

  const validationError = validateErrorInput(req.body?.error);

  if (validationError) {
    return res.status(400).json(emptyResponse(validationError));
  }

  const error = req.body.error.trim();
  console.log("[decode] Incoming query", { query: error });

  // Retrieval is the only source of SAP guidance. The legacy OpenAI helpers
  // below remain for backwards compatibility but are intentionally bypassed.
  try {
    const ragResponse = await decodeWithRag(error);
    console.log("[decode] Final API JSON returned", JSON.stringify(ragResponse));
    return res.status(200).json(ragResponse);
  } catch (ragError) {
    console.error("[decode] RAG retrieval failed", ragError.stack || ragError);
    return res.status(500).json(emptyResponse());
  }

  const hasSensitiveData = containsSensitiveData(error);
  const cacheKey = getCacheKey(error);

  console.log("[decode] Incoming error", {
    length: error.length,
    preview: sanitizeForLog(error),
    hasSensitiveData
  });

  const cached = responseCache.get(cacheKey);

  if (cached) {
    console.log("[decode] Cache hit", { length: error.length });
    return res.status(200).json({
      ...cached,
      hasSensitiveData,
      fromCache: true
    });
  }

  try {
    const result = await callOpenAI(error);
    const payload = {
      result,
      confidence: getConfidence(result),
      hasSensitiveData,
      fromCache: false
    };

    setCache(cacheKey, payload);

    console.log("[decode] Response ready", {
      confidence: payload.confidence,
      outputLength: result.length,
      fromCache: false
    });

    return res.status(200).json(payload);
  } catch (errorDetails) {
    console.error("[decode] Decode API failed", {
      message: sanitizeForLog(errorDetails.message),
      name: errorDetails.name
    });

    return res.status(200).json(fallbackResponse(hasSensitiveData));
  }
}
