const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");
const crypto = require("crypto");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// In-memory cache for decoded errors
const responseCache = new Map();

// Sensitive keywords that indicate PII/sensitive data
const SENSITIVE_KEYWORDS = [
  "salary",
  "payroll",
  "ssn",
  "social security",
  "employee id",
  "credit card",
  "bank account",
  "password",
  "user id",
  "personal",
  "confidential"
];

// Privacy: Mask numbers longer than 4 digits
function maskNumbers(text) {
  return text.replace(/\d{5,}/g, "XXXX");
}

// Detect sensitive keywords in input
function containsSensitiveData(text) {
  const lowerText = text.toLowerCase();
  return SENSITIVE_KEYWORDS.some((keyword) => lowerText.includes(keyword));
}

// Validate response has required sections
function isValidResponse(text) {
  const requiredSections = ["Meaning", "Cause", "Fix", "Risk level"];
  return requiredSections.every((section) => text.includes(section));
}

// Parse structured response and calculate confidence
function parseResponse(text) {
  const hasMeaning = text.includes("Meaning");
  const hasCause = text.includes("Cause");
  const hasFix = text.includes("Fix");
  const hasWho = text.includes("Who can fix");
  const hasRisk = text.includes("Risk level");
  const hasTime = text.includes("Time to fix");

  const sectionsPresent = [hasMeaning, hasCause, hasFix, hasWho, hasRisk, hasTime].filter(Boolean).length;
  let confidence = "Low";
  if (sectionsPresent >= 5) confidence = "High";
  else if (sectionsPresent >= 3) confidence = "Medium";

  return { text, confidence };
}

// Create cache key from error
function getCacheKey(error) {
  return crypto.createHash("sha256").update(error.toLowerCase()).digest("hex");
}

app.use(cors());
app.use(express.json());

app.post("/decode", async (req, res) => {
  const error = req.body?.error?.trim();
  const doNotSave = req.body?.doNotSave || false;

  if (!error) {
    return res.status(400).json({ error: "Error text is required." });
  }

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not configured." });
  }

  // Check for sensitive data
  const hasSensitiveData = containsSensitiveData(error);

  // Check cache first
  const cacheKey = getCacheKey(error);
  if (responseCache.has(cacheKey) && !doNotSave) {
    const cached = responseCache.get(cacheKey);
    return res.json({
      result: cached.text,
      confidence: cached.confidence,
      hasSensitiveData,
      fromCache: true
    });
  }

  // Mask sensitive numbers before sending to AI
  const maskedError = maskNumbers(error);

  const prompt = `You are an SAP expert.

Explain the SAP error in simple terms.

Format strictly with these sections:

🔴 Meaning:
📍 Cause:
🔧 Fix (step-by-step with transaction codes):
🧠 Technical Explanation:
⏱ Time to fix:
👤 Who can fix:
⚠️ Risk level:

If you cannot confidently decode this error, respond with: "Unable to confidently decode this error."

Error: ${maskedError}`;

  let result = null;
  let attempts = 0;
  const maxRetries = 1;

  // Retry once if response is invalid
  while (attempts <= maxRetries && !result) {
    try {
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt
      });
      const text = response.text ? response.text.trim() : "";

      // Validate response format
      if (isValidResponse(text) || text.includes("Unable to confidently decode")) {
        result = text;
      } else {
        attempts++;
        if (attempts > maxRetries) {
          result = "Unable to confidently decode this error.";
        }
      }
    } catch (apiError) {
      console.error(`Attempt ${attempts + 1} failed:`, apiError.message);
      attempts++;
      if (attempts > maxRetries) {
        result = "Unable to confidently decode this error.";
      }
    }
  }

  // Cache the result if doNotSave is false
  if (!doNotSave) {
    const parsed = parseResponse(result);
    responseCache.set(cacheKey, parsed);
  }

  const parsed = parseResponse(result);
  return res.json({
    result: parsed.text,
    confidence: parsed.confidence,
    hasSensitiveData,
    fromCache: false
  });
});

app.listen(PORT, () => {
  console.log(`SAP decoder server running on port ${PORT}`);
});
