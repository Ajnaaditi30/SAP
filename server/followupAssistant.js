const NO_CONTEXT = "The retrieved SAP knowledge base does not contain enough information to answer this question.";
const DEFAULT_MODEL = "openai/gpt-oss-120b";

function detectSimpleIntent(question, hasContext) {
  const normalized = question.toLowerCase().trim().replace(/[.!?,;:]+$/g, "");

  if (/^(hi|hello|hey|good morning|good afternoon|good evening)( there)?$/.test(normalized)) {
    return "Hello! How can I help you with your SAP error today?";
  }
  if (/^(thanks|thank you|thx|thanks a lot|thank you very much)$/.test(normalized)) {
    return "You're welcome! Let me know if you need more help with your SAP error.";
  }
  if (/^(bye|goodbye|see you|take care)$/.test(normalized)) {
    return "Goodbye! I hope your SAP issue gets resolved soon.";
  }
  if (/\b(weather|joke|recipe|sports?|movie|music|news|capital of|write a poem)\b/.test(normalized) ||
      /^(how are you|what's up|what is up)\b/.test(normalized)) {
    return "I can help with SAP troubleshooting or questions about the decoded error. What would you like to know?";
  }

  const sapQuestion = /\b(sap|error|issue|problem|cause|happen|occur|fix|resolve|troubleshoot|transaction|authorization|posting|document|module|diagnostic|verify|verification|configuration|number range)\b/.test(normalized);
  const contextualFollowUp = hasContext && /^(why|how|what|which|where|when|who|can|could|should|would|do|does|is|are|will|explain|tell me more|more|and|also|then|next|about this|about that|what about)\b/.test(normalized);
  if (!sapQuestion && !contextualFollowUp) {
    return "I can help with SAP troubleshooting or questions about the decoded error. What would you like to know?";
  }

  return null;
}

function getContext(context = {}) {
  return {
    error_code: context.error_code || "",
    module: context.module || "",
    title: context.title || "",
    description: context.description || context.meaning || "",
    possible_causes: Array.isArray(context.possible_causes) ? context.possible_causes : [],
    diagnostic_steps: Array.isArray(context.diagnostic_steps) ? context.diagnostic_steps : [],
    recommended_actions: Array.isArray(context.recommended_actions) ? context.recommended_actions : [],
    related_transactions: Array.isArray(context.related_transactions) ? context.related_transactions : [],
    source: context.source || ""
  };
}

function fallbackReply(context) {
  const steps = [...context.diagnostic_steps, ...context.recommended_actions];
  const verification = context.diagnostic_steps.find((step) => /\b(verify|confirm|check|test|ensure)\b/i.test(step));
  const nextStep = context.recommended_actions[0] || context.diagnostic_steps[0];
  const sections = [];
  const summary = context.description || context.title;

  if (summary) sections.push(`## Error Summary\n${summary}`);
  if (context.possible_causes.length) sections.push(`## Possible Causes\n${context.possible_causes.map((cause) => `- ${cause}`).join("\n")}`);
  if (steps.length) sections.push(`## Step-by-Step Solution\n${steps.map((step, index) => `${index + 1}. ${step}`).join("\n")}`);
  if (verification) sections.push(`## Verification\n${verification}`);
  if (nextStep) sections.push(`## Next Step\n${nextStep}`);

  return sections.length ? sections.join("\n\n") : NO_CONTEXT;
}

function cleanAnswer(answer) {
  const lines = String(answer || "").split(/\r?\n/);
  const cleaned = [];

  for (const line of lines) {
    if (/not specified in the retrieved documentation/i.test(line)) {
      if (cleaned.length && /^#{1,3}\s|^[^:\n]{2,50}:$/.test(cleaned[cleaned.length - 1].trim())) {
        cleaned.pop();
      }
      continue;
    }
    if (line.trim() && line.trim() === cleaned[cleaned.length - 1]?.trim()) continue;
    cleaned.push(line);
  }

  return cleaned.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

async function getFollowUpAssistantReply(question, sourceContext = {}, options = {}) {
  const context = getContext(sourceContext);
  const hasContext = Boolean(
    context.description || context.title || context.possible_causes.length ||
    context.diagnostic_steps.length || context.recommended_actions.length
  );
  const simpleReply = detectSimpleIntent(String(question || ""), hasContext);
  if (simpleReply) return simpleReply;

  const apiKey = options.apiKey ?? process.env.GROQ_API_KEY;
  const model = options.model || process.env.GROQ_MODEL || DEFAULT_MODEL;
  const contextText = JSON.stringify(context);

  if (!hasContext) {
    return fallbackReply(context);
  }

  if (!apiKey) return fallbackReply(context);

  const history = Array.isArray(options.history)
    ? options.history
      .filter((entry) => ["user", "assistant"].includes(entry?.role) && typeof entry.text === "string")
      .slice(-8)
      .map((entry) => ({ role: entry.role, content: entry.text.slice(0, 2000) }))
    : [];

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_completion_tokens: 400,
      messages: [
        {
          role: "system",
          content: "Answer directly and concisely using only the provided decoded SAP knowledge-base context and conversation. Never invent SAP causes, transactions, fixes, or configuration steps. Do not claim verification unless the context supports it. For SAP troubleshooting, use Markdown headings as relevant: Error Summary, Possible Causes, Step-by-Step Solution, Verification, Next Step. Use numbered solution steps and bullets for causes. Omit unsupported sections; never use 'Not specified in the retrieved documentation'. For simple greetings, thanks, or goodbyes, respond naturally and briefly."
        },
        ...history,
        {
          role: "user",
          content: `DECODED KNOWLEDGE-BASE CONTEXT:\n${contextText}\n\nFOLLOW-UP QUESTION:\n${question}`
        }
      ]
    })
  });

  if (!response.ok) {
    const responseText = await response.text();
    const message = `Groq request failed (${response.status} ${response.statusText}): ${responseText}`;
    throw new Error(message);
  }

  const data = await response.json();
  const answer = cleanAnswer(data.choices?.[0]?.message?.content);
  return answer || "I could not generate a follow-up answer.";
}

module.exports = {
  getFollowUpAssistantReply
};
