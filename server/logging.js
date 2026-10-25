function redactSecrets(value) {
  let sanitized = String(value || "");
  const apiKey = process.env.GROQ_API_KEY;
  if (apiKey) sanitized = sanitized.split(apiKey).join("[REDACTED]");
  return sanitized.replace(/(authorization\s*:\s*bearer\s+)[^\s,]+/gi, "$1[REDACTED]");
}

function logError(stage, error) {
  const details = {
    name: error instanceof Error ? error.name : "Error",
    message: redactSecrets(error instanceof Error ? error.message : error)
  };

  if (error instanceof Error && error.stack) {
    details.stack = redactSecrets(error.stack);
  }

  console.error(`[${stage}] Pipeline failure`, details);
}

module.exports = { logError };
