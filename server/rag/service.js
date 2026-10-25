const { retrieve } = require("./retriever");
const { buildPrompt } = require("./prompt");
const { logError } = require("../logging");

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

function scoreToPercent(score) {
  const normalized = Number(score);
  if (!Number.isFinite(normalized)) return 0;
  return Math.max(0, Math.min(100, Math.round(normalized * 100)));
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
    confidence_score: 0,
    confidence_details: {
      percent: 0,
      reasons: [],
      low_confidence_message: "Low confidence. Please verify with SAP documentation."
    },
    related_errors: [],
    meaning: description,
    sources: []
  };
}

function documentResponse(result) {
  const doc = result.document || {};
  const metadata = derivedMetadata(doc);
  const score = confidenceFromScore(result.score);
  const confidenceDetails = buildConfidenceDetails(doc, score, result.query || "");

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
    confidence: score,
    confidence_score: scoreToPercent(score),
    confidence_details: confidenceDetails,
    related_errors: [],
    meaning: doc.description || "",
    sources: [doc.source].filter(Boolean)
  };
}

function isValidResponse(value) {
  if (!value || typeof value !== "object") return false;
  const hasDescription = typeof value.description === "string" || typeof value.meaning === "string";
  return hasDescription && Array.isArray(value.possible_causes) && Array.isArray(value.diagnostic_steps) && Array.isArray(value.recommended_actions) && Array.isArray(value.related_transactions) && Array.isArray(value.keywords) && typeof value.time_to_fix === "string" && typeof value.who_can_fix === "string" && typeof value.risk_level === "string";
}

function buildRelatedErrors(retrieved = [], primaryDocument = {}) {
  const primaryId = String(primaryDocument.id || primaryDocument.error_code || "").trim();
  return (Array.isArray(retrieved) ? retrieved : [])
    .filter((item) => item?.document)
    .filter((item) => String(item.document.id || item.document.error_code || "").trim() !== primaryId)
    .slice(0, 3)
    .map((item) => ({
      id: item.document.id || "",
      error_code: item.document.error_code || "",
      module: item.document.module || "",
      title: item.document.title || "",
      similarity_percent: scoreToPercent(item.score),
      score: Number(item.score || 0)
    }));
}

function buildConfidenceDetails(document = {}, score, query = "") {
  const normalizedQuery = String(query || "").toLowerCase();
  const normalizedErrorCode = String(document.error_code || "").toLowerCase();
  const normalizedTitle = String(document.title || "").toLowerCase();
  const percent = scoreToPercent(score);
  const exactMatch = Boolean(normalizedErrorCode && normalizedQuery.includes(normalizedErrorCode)) || Boolean(normalizedTitle && normalizedQuery.includes(normalizedTitle));
  const moduleMatch = Boolean(document.module);
  const highSemanticSimilarity = Number(score) >= 0.7;
  const retrievedFromKnowledgeBase = Boolean(document.source);
  const reasons = [
    { label: "Exact SAP error matched", passed: exactMatch },
    { label: "Same SAP module", passed: moduleMatch },
    { label: "High semantic similarity", passed: highSemanticSimilarity },
    { label: "Retrieved from knowledge base", passed: retrievedFromKnowledgeBase }
  ];

  return {
    percent,
    reasons,
    low_confidence_message: percent < 60 ? "Low confidence. Please verify with SAP documentation." : ""
  };
}

function buildFollowUpAnswer(question = "", context = {}, conversation = []) {
  const normalizedQuestion = String(question || "").trim();
  const lowerQuestion = normalizedQuestion.toLowerCase();
  const contextText = [
    context.description || context.meaning || "",
    context.business_context || "",
    ...(context.possible_causes || []),
    ...(context.recommended_actions || []),
    ...(context.diagnostic_steps || []),
    ...(context.related_transactions || []),
    ...(context.keywords || [])
  ].filter(Boolean);

  const availableContext = contextText.join(" ").trim();

  if (!availableContext) {
    return {
      text: "The retrieved SAP knowledge base does not contain enough information to answer this question.",
      used_context: false,
      used_model_memory: false
    };
  }

  if (/(why|cause|happen|occur)/.test(lowerQuestion)) {
    const causeText = context.possible_causes?.length ? context.possible_causes[0] : context.description || "";
    return {
      text: causeText ? `Based on the retrieved SAP documentation, ${causeText}` : "The retrieved SAP knowledge base does not contain enough information to answer this question.",
      used_context: Boolean(causeText),
      used_model_memory: false
    };
  }

  if (/(prevent|avoid|mitigate|stop)/.test(lowerQuestion)) {
    const actionText = context.recommended_actions?.length ? context.recommended_actions[0] : context.diagnostic_steps?.[0] || "";
    return {
      text: actionText ? `The recommended action from the retrieved SAP knowledge base is: ${actionText}` : "The retrieved SAP knowledge base does not contain enough information to answer this question.",
      used_context: Boolean(actionText),
      used_model_memory: false
    };
  }

  if (/(transaction|use|which|who|owner|resolve|production|time|fix)/.test(lowerQuestion)) {
    if (/(transaction|use|which)/.test(lowerQuestion)) {
      const tx = context.related_transactions?.[0] || "";
      return {
        text: tx ? `The retrieved SAP knowledge base points to the following transaction: ${tx}` : "The retrieved SAP knowledge base does not contain enough information to answer this question.",
        used_context: Boolean(tx),
        used_model_memory: false
      };
    }

    if (/(who|owner|resolve)/.test(lowerQuestion)) {
      const owner = context.who_can_fix || "";
      return {
        text: owner ? `The retrieved SAP documentation indicates that ${owner} is the most appropriate owner.` : "The retrieved SAP knowledge base does not contain enough information to answer this question.",
        used_context: Boolean(owner),
        used_model_memory: false
      };
    }

    if (/(production|risk|affect)/.test(lowerQuestion)) {
      const risk = context.risk_level || "";
      return {
        text: risk ? `The retrieved SAP documentation indicates a ${risk.toLowerCase()} risk level for this issue.` : "The retrieved SAP knowledge base does not contain enough information to answer this question.",
        used_context: Boolean(risk),
        used_model_memory: false
      };
    }

    if (/(time|fix|how long)/.test(lowerQuestion)) {
      const timeToFix = context.time_to_fix || "";
      return {
        text: timeToFix ? `The retrieved SAP documentation suggests the issue typically takes ${timeToFix} to resolve.` : "The retrieved SAP knowledge base does not contain enough information to answer this question.",
        used_context: Boolean(timeToFix),
        used_model_memory: false
      };
    }
  }

  const fallbackText = context.description || context.meaning || "";
  return {
    text: fallbackText ? `Based on the retrieved SAP documentation: ${fallbackText}` : "The retrieved SAP knowledge base does not contain enough information to answer this question.",
    used_context: Boolean(fallbackText),
    used_model_memory: false
  };
}

async function callGroq(prompt) {
  if (!process.env.GROQ_API_KEY) {
    console.info("[groq] request skipped; GROQ_API_KEY is not configured.");
    return null;
  }

  const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  let stage = "request";
  console.info("[groq] request started", { model });

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_completion_tokens: 1000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Format only the supplied retrieved SAP documentation. Never add SAP guidance." },
          { role: "user", content: prompt }
        ]
      })
    });
    stage = "http-response";
    console.info("[groq] response received", { status: response.status, ok: response.ok });
    if (!response.ok) throw new Error(`Groq request failed (${response.status} ${response.statusText}).`);

    stage = "response-json";
    const data = await response.json();
    stage = "response-content";
    const answer = JSON.parse(data.choices?.[0]?.message?.content || "{}");
    console.info("[groq] response parsed successfully");
    return answer;
  } catch (error) {
    if (error instanceof Error) error.stage = `groq:${stage}`;
    throw error;
  }
}

function constrainToSources(answer, retrieved, score) {
  const answerObject = answer || {};
  const selected = retrieved.find(({ document }) => (
    (answerObject.id && answerObject.id === document.id) ||
    (answerObject.error_code && answerObject.error_code === document.error_code)
  )) || retrieved[0];
  const response = documentResponse({ document: selected.document, score: selected.score ?? score });
  response.related_errors = buildRelatedErrors(retrieved, selected.document);
  response.sources = [...new Set(retrieved.map((item) => item.document.source).filter(Boolean))];
  return response;
}

async function decodeWithRag(query) {
  console.info("[rag] stage=retrieval status=started");
  let retrieved;
  try {
    retrieved = await retrieve(query, 5);
  } catch (error) {
    logError("rag:retrieval", error);
    throw error;
  }
  console.info("[rag] stage=retrieval status=completed", {
    documentCount: retrieved.length,
    topMatch: retrieved[0]?.document?.id || null,
    topScore: retrieved[0] ? Number(retrieved[0].score.toFixed(4)) : null,
    matchType: retrieved[0]?.matchType || "semantic"
  });
  if (!retrieved.length || retrieved[0].score < MIN_RELEVANCE_SCORE) {
    return emptyResponse();
  }

  const deterministic = documentResponse({ document: retrieved[0].document, score: retrieved[0].score, query });
  deterministic.related_errors = buildRelatedErrors(retrieved, retrieved[0].document);
  deterministic.confidence_details = buildConfidenceDetails(retrieved[0].document, retrieved[0].score, query);
  deterministic.confidence_score = scoreToPercent(retrieved[0].score);
  console.info("[rag] stage=response-mapping status=started", {
    id: retrieved[0].document.id,
    sourceCount: deterministic.sources.length
  });
  const prompt = buildPrompt(query, retrieved);
  try {
    console.info("[rag] stage=groq-formatting status=started");
    const generated = await callGroq(prompt);
    const response = isValidResponse(generated) ? constrainToSources(generated, retrieved, retrieved[0].score) : deterministic;
    response.related_errors = buildRelatedErrors(retrieved, response);
    response.confidence_details = buildConfidenceDetails(response, response.confidence || retrieved[0].score, query);
    response.confidence_score = scoreToPercent(response.confidence || retrieved[0].score);
    console.info("[rag] stage=response-selection status=completed", {
      generatedResponseUsed: response !== deterministic,
      confidence: response.confidence
    });
    return response;
  } catch (error) {
    logError(error.stage || "rag:response-mapping", error);
    console.warn("[rag] Groq formatting unavailable; returning the retrieved knowledge-base record.");
    return deterministic;
  }
}

module.exports = {
  NOT_FOUND,
  decodeWithRag,
  emptyResponse,
  documentResponse,
  constrainToSources,
  buildRelatedErrors,
  buildConfidenceDetails,
  buildFollowUpAnswer
};