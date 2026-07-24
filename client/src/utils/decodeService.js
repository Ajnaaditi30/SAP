const LOCAL_DECODE_URL = "http://localhost:5000/decode";

const FALLBACK_RESPONSE = {
  result: "Backend is not running on http://localhost:5000. Please start the backend and try again.",
  confidence: "Low",
  hasSensitiveData: false,
  fromCache: false
};

const isDecodeResponse = (value) => {
  return Boolean(
    value &&
    typeof value.result === "string" &&
    ["High", "Medium", "Low"].includes(value.confidence)
  );
};

const confidenceLabel = (score) => {
  if (score > 0.9) return "High";
  if (score >= 0.7) return "Medium";
  return "Low";
};

const formatRagResponse = (data) => {
  if (!data || (typeof data.description !== "string" && typeof data.meaning !== "string")) return null;

  const numberedList = (items) => (
    Array.isArray(items) && items.length
      ? items.map((item, index) => `${index + 1}. ${item}`).join("\n")
      : "Not available."
  );

  const bulletedList = (items) => (
    Array.isArray(items) && items.length
      ? items.map((item) => `- ${item}`).join("\n")
      : "Not available."
  );

  const listText = (items) => (
    Array.isArray(items) && items.length ? items.join(", ") : "Not available."
  );

  const description = data.description || data.meaning || "Not available.";
  const title = data.title || "Not available.";
  const businessContext = data.business_context || "Not available.";
  const possibleCauses = data.possible_causes || [];
  const diagnosticSteps = data.diagnostic_steps || [];
  const recommendedActions = data.recommended_actions || [];
  const relatedTransactions = data.related_transactions || [];
  const keywords = data.keywords || [];
  const source = data.source || "Not available.";
  const timeToFix = data.time_to_fix || "Not provided.";
  const whoCanFix = data.who_can_fix || "Not provided.";
  const riskLevel = data.risk_level || "Not provided.";
  const confidence = confidenceLabel(Number(data.confidence));

  return {
    result: `Title:\n${title}\n\nMeaning:\n${description}\n\nBusiness Context:\n${businessContext}\n\nPossible Causes:\n${bulletedList(possibleCauses)}\n\nDiagnostic Steps:\n${numberedList(diagnosticSteps)}\n\nRecommended Actions:\n${bulletedList(recommendedActions)}\n\nRelated Transactions:\n${listText(relatedTransactions)}\n\nKeywords:\n${listText(keywords)}\n\nTime to Fix:\n${timeToFix}\n\nWho Can Fix:\n${whoCanFix}\n\nRisk Level:\n${riskLevel}\n\nSource:\n${source}\n\nConfidence:\n${confidence}`,
    confidence,
    hasSensitiveData: false,
    fromCache: false
  };
};

export const decodeService = {
  decodeError: async (error) => {
    const response = await fetch(LOCAL_DECODE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ error })
    });

    const contentType = response.headers.get("content-type");

    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Invalid API response (not JSON)");
    }

    const data = await response.json();
    console.log("[decode] API JSON received by frontend", JSON.stringify(data));

    if (!response.ok) {
      throw new Error(data.result || `Decode request failed with status ${response.status}`);
    }

    const formattedRagResponse = formatRagResponse(data);
    if (formattedRagResponse) {
      console.log("[decode] UI metadata mapping", JSON.stringify({
        time_to_fix: data.time_to_fix || "",
        who_can_fix: data.who_can_fix || "",
        risk_level: data.risk_level || "",
        title: data.title || ""
      }));
      return formattedRagResponse;
    }

    if (!isDecodeResponse(data)) {
      throw new Error("Invalid API response format");
    }

    return {
      result: data.result,
      confidence: data.confidence,
      hasSensitiveData: Boolean(data.hasSensitiveData),
      fromCache: Boolean(data.fromCache)
    };
  },

  decodeWithFallback: async (error) => {
    try {
      return await decodeService.decodeError(error);
    } catch (requestError) {
      console.error("Decode request failed:", requestError);
      if (requestError instanceof TypeError) {
        return FALLBACK_RESPONSE;
      }

      return {
        ...FALLBACK_RESPONSE,
        result: requestError.message || FALLBACK_RESPONSE.result
      };
    }
  }
};
