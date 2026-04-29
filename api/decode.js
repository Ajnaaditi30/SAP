const MOCK_RESULT = `Meaning: This is a simulated decoded SAP error.
Cause: Mock cause.
Fix Steps: Mock fix steps.
Time to Fix: 15-30 minutes.
Who Can Fix: SAP Basis or functional support team.
Risk Level: Medium.`;

const containsSensitiveData = (value) => {
  return /\b\d{8,}\b|(?:password|passwd|secret|token|api[_-]?key)\s*[:=]/i.test(value);
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      result: "Method not allowed.",
      confidence: "Low",
      hasSensitiveData: false,
      fromCache: false
    });
  }

  const error = String(req.body?.error || "").trim();

  if (!error) {
    return res.status(400).json({
      result: "Please provide an SAP error to decode.",
      confidence: "Low",
      hasSensitiveData: false,
      fromCache: false
    });
  }

  return res.status(200).json({
    result: MOCK_RESULT,
    confidence: "Medium",
    hasSensitiveData: containsSensitiveData(error),
    fromCache: false
  });
}
