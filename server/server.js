const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");
const crypto = require("crypto");
const { decodeWithRag, emptyResponse } = require("./rag/service");

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

function buildKnownErrorResult({ meaning, causes, steps, technical, time, owner, risk }) {
  return `Meaning:
${meaning}

Cause:
${causes.map((cause) => `- ${cause}`).join("\n")}

Fix Steps:
${steps.map((step, index) => `${index + 1}. ${step}`).join("\n")}

Technical Explanation:
${technical}

Time to fix:
${time}

Who can fix:
${owner}

Risk level:
${risk}`;
}

function decodeKnownSapError(error) {
  const normalized = error.toUpperCase();

  if (normalized.includes("DBSQL_DUPLICATE_KEY_ERROR") || normalized.includes("DUPLICATE KEY")) {
    return buildKnownErrorResult({
      meaning: "SAP tried to insert a database row whose primary key already exists. This is a database consistency or application logic issue, not a generic connectivity problem.",
      causes: [
        "A program, BAPI, IDoc, batch job, or enhancement attempted to create a record with a key that is already present.",
        "Number range buffering or custom number assignment may have reused an existing number.",
        "A retry or duplicate interface message may have posted the same business object twice.",
        "Custom ABAP may be missing an existence check before INSERT."
      ],
      steps: [
        "Open the ST22 dump and identify the ABAP program, include, line number, database table, and key fields.",
        "Check whether the failing table already contains the key shown in the dump using SE16N or a safe display transaction.",
        "If caused by an interface, check duplicate inbound messages in WE02/WE05 for IDocs, SXMB_MONI/SRT_MONI for PI/PO or web services, or the relevant job log in SM37.",
        "If caused by number assignment, review the number range object in SNRO and check buffering or current number status.",
        "For custom code, replace blind INSERT logic with SELECT/READ existence validation, MODIFY/UPDATE where appropriate, or duplicate handling with a clear business rule.",
        "Do not delete database records directly unless SAP support or an approved recovery procedure confirms it is safe."
      ],
      technical: "The ABAP database interface raised an exception because the database rejected an INSERT due to a unique index or primary-key collision. The dump usually names the table and key that caused the conflict.",
      time: "30 minutes to 4 hours, depending on whether it is a duplicate message, number range issue, or custom ABAP defect.",
      owner: "ABAP developer with the functional owner of the affected process; Basis may help inspect dumps and jobs.",
      risk: "High"
    });
  }

  if (normalized.includes("RFC_ERROR_COMMUNICATION") || normalized.includes("RFC_ERROR_SYSTEM_FAILURE") || normalized.includes("CALL_FUNCTION_COMMUNICATION") || normalized.includes("PARTNER NOT REACHED")) {
    return buildKnownErrorResult({
      meaning: "An RFC call failed because SAP could not communicate reliably with the target system, destination, gateway, or registered program.",
      causes: [
        "The target host, port, SAP gateway, or registered RFC server program is down or unreachable.",
        "The SM59 destination points to the wrong host, system number, gateway service, or program ID.",
        "Firewall, DNS, routing, SNC, or network timeout problems are blocking the connection.",
        "The remote SAP system is overloaded, stopped, or rejecting logons."
      ],
      steps: [
        "Test the RFC destination in SM59 and note the exact error text.",
        "Verify the target application server, gateway host, gateway service, and program ID in SM59.",
        "Check gateway and work process status in SMGW, SM51, and SM66 on the relevant SAP systems.",
        "Check system logs in SM21 and short dumps in ST22 around the failure time.",
        "If it is a registered server program, confirm the external program is running and registered in SMGW.",
        "Ask the network or Basis team to verify firewall, DNS, routing, and port reachability between source and target."
      ],
      technical: "RFC communication errors occur before or during remote function execution. The ABAP caller could not complete the CPIC/RFC connection or lost communication with the remote endpoint.",
      time: "15 minutes to 2 hours for configuration or service restart; longer if firewall or network routing changes are needed.",
      owner: "SAP Basis team; network team if connectivity is blocked; ABAP team only if the destination is selected incorrectly by custom code.",
      risk: "Medium"
    });
  }

  if (normalized.includes("ST22") || normalized.includes("SHORT DUMP") || normalized.includes("ABAP RUNTIME ERROR")) {
    return buildKnownErrorResult({
      meaning: "SAP recorded an ABAP runtime dump. A program terminated unexpectedly and the detailed failure analysis is available in transaction ST22.",
      causes: [
        "The ABAP program hit an unhandled exception, invalid data condition, authorization issue, memory issue, or database error.",
        "Custom code, user exits, BADIs, or enhancements may have failed during a business process.",
        "The dump category determines the real root cause, so the exact runtime error and source line must be reviewed."
      ],
      steps: [
        "Open ST22 and display the dump for the affected user, time, client, and application server.",
        "Read Runtime Error, Exception, ABAP Program, Include, Line, and Error Analysis sections.",
        "If the object is custom code, send the program/include/line and variable details to the ABAP developer.",
        "If the dump points to standard SAP code, search SAP Notes with the runtime error, program name, and support package level.",
        "Check SM21, SM37, SLG1, and application logs if the dump happened in a job or interface.",
        "Retest only after the root cause is corrected or an SAP Note/configuration fix is applied."
      ],
      technical: "ST22 is the ABAP short dump monitor. It captures runtime termination context including call stack, source location, variable content, and system environment.",
      time: "15 minutes to identify the dump; 1 hour to several days to fix depending on whether it is data, configuration, custom code, or SAP standard defect.",
      owner: "ABAP developer for code dumps, Basis for system/resource dumps, functional consultant for data or configuration causes.",
      risk: "Medium"
    });
  }

  if (normalized.includes("TIME_OUT")) {
    return buildKnownErrorResult({
      meaning: "An ABAP dialog work process exceeded the configured maximum runtime and SAP terminated the program.",
      causes: [
        "The transaction or report is processing too much data in dialog mode.",
        "A custom SELECT, loop, or nested logic is inefficient.",
        "Database performance is poor or required indexes/statistics are missing.",
        "The operation should run in background instead of foreground."
      ],
      steps: [
        "Open ST22 and confirm the TIME_OUT dump, program, include, and line.",
        "Run the process with a smaller selection range to confirm data volume is the trigger.",
        "Schedule long-running reports as background jobs in SM36/SM37.",
        "Use ST05, SAT, or SQL Monitor to identify slow SQL or inefficient ABAP logic.",
        "Optimize custom code, add safe selection criteria, or review database indexes with Basis/DBA.",
        "Avoid increasing timeout parameters as a first fix unless Basis approves it for a justified workload."
      ],
      technical: "The profile parameter for maximum dialog runtime was exceeded, so the SAP kernel terminated the work process request and created a short dump.",
      time: "30 minutes to 1 day depending on whether the issue is data selection, custom code, or database performance.",
      owner: "ABAP developer and Basis/DBA; functional consultant if selection criteria or business process design is the cause.",
      risk: "Medium"
    });
  }

  if (normalized.includes("TSV_TNEW_PAGE_ALLOC_FAILED") || normalized.includes("SYSTEM_NO_ROLL") || normalized.includes("MEMORY")) {
    return buildKnownErrorResult({
      meaning: "The ABAP runtime could not allocate enough memory for the process, so the program terminated.",
      causes: [
        "The report or transaction selected too much data into internal tables.",
        "Custom ABAP may be building large tables without pagination, filtering, or package processing.",
        "SAP memory settings or application server resources may be insufficient for the workload.",
        "A background job may be processing a larger-than-normal dataset."
      ],
      steps: [
        "Open ST22 and identify the program, internal table, and memory allocation details.",
        "Reduce the selection range and rerun in background if appropriate.",
        "For custom code, process records in packages and avoid loading unnecessary columns or full tables.",
        "Check SM50/SM66 and ST02 for memory pressure on the application server.",
        "Basis should review memory parameters only after the program/data-volume cause is understood.",
        "If standard SAP code is involved, search SAP Notes using the dump name and program."
      ],
      technical: "SAP exhausted available extended/heap/roll memory for the work process or hit an internal allocation limit while growing runtime data structures.",
      time: "1 hour to 1 day depending on whether code optimization or Basis parameter review is required.",
      owner: "ABAP developer for program memory usage; Basis for memory parameters and server capacity.",
      risk: "High"
    });
  }

  return null;
}

app.use(cors());
app.use(express.json());

app.post("/decode", async (req, res) => {
  try {
    // Request/RAG diagnostics are logged once below with a consistent prefix.

    const error = typeof req.body?.error === "string" ? req.body.error.trim() : "";
    const doNotSave = req.body?.doNotSave || false;

    if (!error) {
      return res.status(400).json(emptyResponse("Please enter an error."));
    }

    console.log("[decode] Incoming query", { query: error });

    // Use the same local FAISS-backed retrieval flow as the deployed API.
    // The existing implementation remains below for backwards compatibility.
    const ragResponse = await decodeWithRag(error);
    console.log("[decode] Final API JSON returned", JSON.stringify(ragResponse));
    return res.json(ragResponse);

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

    const knownResult = decodeKnownSapError(error);

    if (knownResult) {
      const parsed = {
        text: knownResult,
        confidence: "High"
      };

      if (!doNotSave) {
        responseCache.set(cacheKey, parsed);
      }

      return res.json({
        result: parsed.text,
        confidence: parsed.confidence,
        hasSensitiveData,
        fromCache: false
      });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        result: "Backend API key is not configured.",
        confidence: "Low",
        hasSensitiveData,
        fromCache: false
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
  } catch (errorDetails) {
    console.error("[decode] Route failed:", errorDetails.stack || errorDetails);
    return res.status(500).json(emptyResponse("Unable to decode error. Please try again."));
  }
});

app.listen(PORT, () => {
  console.log(`SAP decoder server running on port ${PORT}`);
});
