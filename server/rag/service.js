const { retrieve } = require("./retriever");
const { buildPrompt } = require("./prompt");

const MIN_RELEVANCE_SCORE = 0.2;
const NOT_FOUND = "No relevant SAP documentation was found.";
const MODULE_OWNERS = {
  MM: "SAP MM Functional Consultant",
  FI: "SAP FI Consultant",
  SD: "SAP SD Functional Consultant",
  PP: "SAP PP Consultant",
  QM: "SAP QM Functional Consultant",
  ABAP: "ABAP Developer",
  BASIS: "SAP Basis Administrator",
  AUTHORIZATION: "SAP Security Administrator"
};

function confidenceFromScore(score) {
  const normalized = Number(score);
  if (!Number.isFinite(normalized)) return 0.45;
  if (normalized > 0.9) return 0.95;
  if (normalized >= 0.7) return 0.8;
  return 0.45;
}

function derivedMetadata(document = {}) {
  const text = [document.title, document.description, document.business_context, ...(document.recommended_actions || [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const module = String(document.module || "").toUpperCase();

  return {
    time_to_fix: document.time_to_fix || (document.diagnostic_steps?.length ? "15-60 minutes" : ""),
    who_can_fix: document.who_can_fix || MODULE_OWNERS[module] || "",
    risk_level: document.risk_level || (/(posting|payment|financial|integration|rfc|update|production)/.test(text) ? "High" : "Medium")
  };
}

function chooseText(value, fallback = "") {
  if (typeof value === "string") return value.trim() ? value : fallback;
  return value ?? fallback;
}

function chooseArray(value, fallback = []) {
  if (Array.isArray(value) && value.length) return stringArray(value);
  return stringArray(fallback);
}

function emptyResponse(description = NOT_FOUND) {
  return {
    id: "",
    error_code: "",
    module: "",
    title: "",
    description: description,
    business_context: "",
    possible_causes: [],
    diagnostic_steps: [],
    recommended_actions: [],
    related_transactions: [],
    keywords: [],
    source: "",
    time_to_fix: "",
    who_can_fix: "",
    risk_level: "",
    confidence: 0,
    meaning: description,
    sources: []
  };
}

function documentResponse(result) {
  const doc = result.document || {};
  const metadata = derivedMetadata(doc);
  return {
    id: doc.id || "",
    error_code: doc.error_code || "",
    module: doc.module || "",
    title: doc.title || "",
    description: doc.description || "",
    business_context: doc.business_context || "",
    possible_causes: Array.isArray(doc.possible_causes) ? doc.possible_causes : [],
    diagnostic_steps: Array.isArray(doc.diagnostic_steps) ? doc.diagnostic_steps : [],
    recommended_actions: Array.isArray(doc.recommended_actions) ? doc.recommended_actions : [],
    related_transactions: Array.isArray(doc.related_transactions) ? doc.related_transactions : [],
    keywords: Array.isArray(doc.keywords) ? doc.keywords : [],
    source: doc.source || "",
    time_to_fix: metadata.time_to_fix,
    who_can_fix: metadata.who_can_fix,
    risk_level: metadata.risk_level,
    confidence: confidenceFromScore(result.score),
    meaning: doc.description || "",
    sources: [doc.source].filter(Boolean)
  };
}

function stringArray(value) {
  return Array.isArray(value) ? value.filter((item) => item != null).map(String) : [];
}

function isValidResponse(value) {
  if (!value || typeof value !== "object") return false;
  const hasDescription = typeof value.description === "string" || typeof value.meaning === "string";
  return hasDescription && Array.isArray(value.possible_causes) && Array.isArray(value.diagnostic_steps) && Array.isArray(value.recommended_actions) && Array.isArray(value.related_transactions) && Array.isArray(value.keywords) && typeof value.time_to_fix === "string" && typeof value.who_can_fix === "string" && typeof value.risk_level === "string";
}

async function callOpenAI(prompt) {
  if (!process.env.OPENAI_API_KEY) {
    console.log("[rag:service] LLM call skipped: OPENAI_API_KEY is not configured.");
    return null;
  }
  console.log("[rag:service] Prompt sent to the LLM", prompt);
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-4o-mini", temperature: 0, response_format: { type: "json_object" }, messages: [{ role: "user", content: prompt }] })
  });
  if (!response.ok) throw new Error(`OpenAI request failed (${response.status}).`);
  const data = await response.json();
  const answer = JSON.parse(data.choices?.[0]?.message?.content || "{}");
  console.log("[rag:service] LLM JSON response", JSON.stringify(answer));
  return answer;
}

function constrainToSources(answer, retrieved, score) {
  const primary = retrieved[0]?.document || {};
  const metadata = derivedMetadata(primary);
  const answerObject = answer || {};
  const description = chooseText(answerObject.description || answerObject.meaning, primary.description || "");
  return {
    id: chooseText(answerObject.id, primary.id || ""),
    error_code: chooseText(answerObject.error_code, primary.error_code || ""),
    module: chooseText(answerObject.module, primary.module || ""),
    title: chooseText(answerObject.title, primary.title || ""),
    description,
    business_context: chooseText(answerObject.business_context, primary.business_context || ""),
    possible_causes: chooseArray(answerObject.possible_causes, primary.possible_causes),
    diagnostic_steps: chooseArray(answerObject.diagnostic_steps, primary.diagnostic_steps),
    recommended_actions: chooseArray(answerObject.recommended_actions, primary.recommended_actions),
    related_transactions: chooseArray(answerObject.related_transactions, primary.related_transactions),
    keywords: chooseArray(answerObject.keywords, primary.keywords),
    source: chooseText(answerObject.source, primary.source || ""),
    time_to_fix: chooseText(answerObject.time_to_fix, metadata.time_to_fix),
    who_can_fix: chooseText(answerObject.who_can_fix, metadata.who_can_fix),
    risk_level: chooseText(answerObject.risk_level, metadata.risk_level),
    confidence: confidenceFromScore(score),
    meaning: description,
    sources: [...new Set(retrieved.map((item) => item.document.source).filter(Boolean))]
  };
}

async function decodeWithRag(query) {
  const retrieved = await retrieve(query, 5);
  console.log("[rag:service] Retrieval summary", {
    documentCount: retrieved.length,
    documents: retrieved.map((item) => ({ id: item.document.id, errorCode: item.document.error_code, score: Number(item.score.toFixed(4)), matchType: item.matchType || "semantic" }))
  });
  if (!retrieved.length || retrieved[0].score < MIN_RELEVANCE_SCORE) {
    const response = emptyResponse();
    console.log("[rag:service] Final JSON returned", JSON.stringify(response));
    return response;
  }

  const deterministic = documentResponse(retrieved[0]);
  console.log("[rag:service] Metadata derived from retrieved document", JSON.stringify({
    source: retrieved[0].document.source,
    id: retrieved[0].document.id,
    time_to_fix: deterministic.time_to_fix,
    who_can_fix: deterministic.who_can_fix,
    risk_level: deterministic.risk_level
  }));
  const prompt = buildPrompt(query, retrieved);
  console.log("[rag:service] Prompt prepared", prompt);
  try {
    const generated = await callOpenAI(prompt);
    const response = isValidResponse(generated) ? constrainToSources(generated, retrieved, retrieved[0].score) : deterministic;
    console.log("[rag:service] Final JSON returned", JSON.stringify(response));
    return response;
  } catch (error) {
    console.error("[rag:service] LLM response unavailable; returning retrieved documentation only.", error.stack || error);
    console.log("[rag:service] Final JSON returned", JSON.stringify(deterministic));
    return deterministic;
  }
}

module.exports = { NOT_FOUND, decodeWithRag, emptyResponse, documentResponse, constrainToSources };