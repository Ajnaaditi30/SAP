function toContext(item) {
  const doc = item.document;
  // JSON preserves each source array item exactly, avoiding accidental merging
  // or summarisation caused by a human-readable delimiter format.
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
    source: doc.source || ""
  };
}

function buildPrompt(query, results) {
  const documents = results.map(toContext);
  return `You are a deterministic SAP RAG response formatter.

You must use ONLY the RETRIEVED_DOCUMENTS JSON below. Do not use SAP knowledge, general knowledge, assumptions, or information from the user query that is absent from those documents. Never invent SAP information.

Select the single retrieved document that best matches the user query. Return a STRICT JSON object using this exact schema and never return null:
{
  "id": "",
  "error_code": "",
  "module": "",
  "title": "",
  "description": "",
  "business_context": "",
  "possible_causes": [],
  "diagnostic_steps": [],
  "recommended_actions": [],
  "related_transactions": [],
  "keywords": [],
  "source": "",
  "time_to_fix": "",
  "who_can_fix": "",
  "risk_level": "",
  "confidence": 0.0
}

Preservation rules:
- Preserve every field from the selected document when present.
- Copy arrays verbatim, preserving item order.
- If a field is missing or not an array, use "" or [] as appropriate.
- Do not add values that are not present in the selected document, except for time_to_fix, who_can_fix, risk_level, and confidence as specified below.
- time_to_fix: provide a conservative estimate based only on the selected document's business impact; use "" if it cannot be estimated from that document.
- who_can_fix: use exactly one of these module mappings: MM -> "SAP MM Functional Consultant"; FI -> "SAP FI Consultant"; SD -> "SAP SD Consultant"; PP -> "SAP PP Consultant"; QM -> "SAP QM Consultant"; ABAP -> "ABAP Developer"; BASIS -> "SAP Basis Administrator"; Authorization -> "SAP Security Administrator". Use "" for any other module.
- risk_level: return only "Low", "Medium", or "High", based only on the selected document's business impact. Use "" when the context does not support an assessment.
- confidence: return a number from 0.0 to 1.0 based only on the match quality of the retrieved document.

Return STRICT JSON ONLY. No Markdown, explanation, comments, or additional keys.

User query: ${query}

RETRIEVED_DOCUMENTS:
${JSON.stringify(documents)}`;
}

module.exports = { buildPrompt };
