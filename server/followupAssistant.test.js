const test = require("node:test");
const assert = require("node:assert/strict");
const { getFollowUpAssistantReply } = require("./followupAssistant");

test("returns the assistant answer from the Groq endpoint", async () => {
  const originalFetch = global.fetch;
  let requestUrl = "";
  let requestBody = null;

  global.fetch = async (url, options) => {
    requestUrl = url;
    requestBody = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "The likely cause is a missing authorization object." } }]
      })
    };
  };

  try {
    const answer = await getFollowUpAssistantReply("Why is this happening?", {
      apiKey: "test-key",
      model: "llama-3.3-70b-versatile"
    });

    assert.equal(answer, "The likely cause is a missing authorization object.");
    assert.equal(requestUrl, "https://api.groq.com/openai/v1/chat/completions");
    assert.equal(requestBody.model, "llama-3.3-70b-versatile");
    assert.match(requestBody.messages[0].content, /SAP ERP consultant/i);
  } finally {
    global.fetch = originalFetch;
  }
});
