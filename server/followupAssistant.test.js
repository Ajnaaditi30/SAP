const test = require("node:test");
const assert = require("node:assert/strict");
const { getFollowUpAssistantReply } = require("./followupAssistant");

test("returns a concise Groq answer grounded in the decoded record", async () => {
  const originalFetch = global.fetch;
  let requestUrl = "";
  let requestBody = null;

  global.fetch = async (url, options) => {
    requestUrl = url;
    requestBody = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({
      choices: [{ message: { content: "## Error Summary\nAuthorization failed.\n\n## Possible Causes\n- The role lacks the required authorization.\n\n## Step-by-Step Solution\n1. Review the documented role assignment.\n\n## Verification\nCheck authorization after the change.\n\n## Next Step\n**Contact the SAP security administrator.**\n\n## Extra detail\nNot specified in the retrieved documentation." } }]
      })
    };
  };

  try {
    const answer = await getFollowUpAssistantReply("Why is this happening?", {
      title: "Authorization failure",
      description: "A required authorization is missing.",
      possible_causes: ["The role lacks the required authorization."]
    }, {
      apiKey: "test-key",
      model: "openai/gpt-oss-120b",
      history: [
        { role: "user", text: "What does the error mean?" },
        { role: "assistant", text: "Authorization failed." }
      ]
    });

    assert.match(answer, /## Step-by-Step Solution\n1\. Review the documented role assignment\./);
    assert.match(answer, /\*\*Contact the SAP security administrator\.\*\*/);
    assert.doesNotMatch(answer, /Not specified in the retrieved documentation/);
    assert.equal(requestUrl, "https://api.groq.com/openai/v1/chat/completions");
    assert.equal(requestBody.model, "openai/gpt-oss-120b");
    assert.equal(requestBody.max_completion_tokens, 400);
    assert.match(requestBody.messages[0].content, /only the provided decoded SAP knowledge-base context/i);
    assert.deepEqual(requestBody.messages.slice(1, 3), [
      { role: "user", content: "What does the error mean?" },
      { role: "assistant", content: "Authorization failed." }
    ]);
    assert.equal(requestBody.messages[3].role, "user");
    assert.match(requestBody.messages[3].content, /The role lacks the required authorization/);
  } finally {
    global.fetch = originalFetch;
  }
});

test("uses a structured knowledge-base fallback without an API key", async () => {
  const answer = await getFollowUpAssistantReply("How do I proceed?", {
    description: "The document number could not be issued.",
    diagnostic_steps: ["Check the number range status."]
  }, { apiKey: "" });

  assert.match(answer, /## Error Summary/);
  assert.match(answer, /## Step-by-Step Solution\n1\. Check the number range status\./);
  assert.match(answer, /## Verification\nCheck the number range status\./);
  assert.doesNotMatch(answer, /Not specified in the retrieved documentation/);
});

test("replies naturally to greetings, thanks, and goodbyes without calling Groq", async (t) => {
  const originalFetch = global.fetch;
  global.fetch = async () => {
    throw new Error("Groq should not be called for simple social messages");
  };

  t.after(() => {
    global.fetch = originalFetch;
  });

  const cases = [
    ["hello", /Hello! How can I help you with your SAP error today\?/],
    ["Thanks!", /You're welcome/],
    ["bye", /Goodbye!/]
  ];

  for (const [question, expected] of cases) {
    assert.match(await getFollowUpAssistantReply(question), expected);
  }
});

test("responds briefly to unrelated conversation without calling Groq", async (t) => {
  const originalFetch = global.fetch;
  global.fetch = async () => {
    throw new Error("Groq should not be called for unrelated conversation");
  };

  t.after(() => {
    global.fetch = originalFetch;
  });

  const answer = await getFollowUpAssistantReply("Tell me a joke");
  assert.match(answer, /I can help with SAP troubleshooting/);
  assert.doesNotMatch(answer, /Not specified in the retrieved documentation/);
});
