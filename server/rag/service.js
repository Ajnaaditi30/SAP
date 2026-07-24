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

function stringArray(value) {
  return Array.isArray(value) ? value.filter((item) => item != null).map(String) : [];
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
  const response = {
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
    confidence_score: scoreToPercent(score),
    confidence_details: buildConfidenceDetails(primary, score, ""),
    related_errors: buildRelatedErrors(retrieved, primary),
    meaning: description,
    sources: [...new Set(retrieved.map((item) => item.document.source).filter(Boolean))]
  };

  return response;
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

  const deterministic = documentResponse({ document: retrieved[0].document, score: retrieved[0].score, query });
  deterministic.related_errors = buildRelatedErrors(retrieved, retrieved[0].document);
  deterministic.confidence_details = buildConfidenceDetails(retrieved[0].document, retrieved[0].score, query);
  deterministic.confidence_score = scoreToPercent(retrieved[0].score);
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
    response.related_errors = buildRelatedErrors(retrieved, response);
    response.confidence_details = buildConfidenceDetails(response, response.confidence || retrieved[0].score, query);
    response.confidence_score = scoreToPercent(response.confidence || retrieved[0].score);
    console.log("[rag:service] Final JSON returned", JSON.stringify(response));
    return response;
  } catch (error) {
    console.error("[rag:service] LLM response unavailable; returning retrieved documentation only.", error.stack || error);
    console.log("[rag:service] Final JSON returned", JSON.stringify(deterministic));
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