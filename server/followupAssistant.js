async function getFollowUpAssistantReply(question, options = {}) {
  const apiKey = options.apiKey || process.env.GROQ_API_KEY;
  const model = options.model || process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

  if (!apiKey) {
    return "The follow-up assistant is not configured yet. Please add GROQ_API_KEY to the server environment.";
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: "You are an expert SAP ERP consultant. Answer SAP troubleshooting questions professionally in simple English. Give practical advice. Never invent SAP transaction codes. If uncertain, say the answer depends on the customer's SAP configuration. Keep answers under 200 words."
        },
        {
          role: "user",
          content: question
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
  return data.choices?.[0]?.message?.content?.trim() || "I could not generate a follow-up answer.";
}

module.exports = {
  getFollowUpAssistantReply
};
