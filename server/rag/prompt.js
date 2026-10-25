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

  return `Return one concise JSON object using only the best-matching retrieved document. Do not use outside SAP knowledge or invent details. Copy its SAP-specific text and arrays verbatim, preserving array order; do not add transactions, fixes, or configuration steps. Put the error summary in description, documented causes in possible_causes, documented troubleshooting in diagnostic_steps and recommended_actions, and only listed transactions in related_transactions. If verification is not documented, do not imply that it occurred. Use empty strings/arrays for missing fields. Set confidence from retrieval match quality, not as a verified probability. Keep all other fields exactly as in this schema:
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

USER QUERY: ${JSON.stringify(query)}

RETRIEVED DOCUMENTS:
${JSON.stringify(documents)}

Return valid JSON only; no Markdown or additional keys.`;
}

module.exports = { buildPrompt };
