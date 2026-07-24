const crypto = require("crypto");

// Fixed-size hashing embeddings are local, deterministic, and require no cloud
// model download. The same tokenizer is used during ingestion and retrieval.
const EMBEDDING_DIMENSION = 512;

function tokenize(text) {
  const raw = String(text || "").toLowerCase().match(/[a-z0-9_/-]+/g) || [];
  return raw.flatMap((token) => [token, ...token.split(/[_/-]+/).filter((part) => part !== token)]);
}

function hashToken(token) {
  const hash = crypto.createHash("sha256").update(token).digest();
  return hash.readUInt32LE(0) % EMBEDDING_DIMENSION;
}

function normalize(vector) {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return magnitude ? vector.map((value) => value / magnitude) : vector;
}

function embed(text) {
  const vector = Array(EMBEDDING_DIMENSION).fill(0);
  for (const token of tokenize(text)) vector[hashToken(token)] += 1;
  const embedding = normalize(vector);
  console.log("[rag:embedder] Embedding generated successfully", { dimension: EMBEDDING_DIMENSION, tokenCount: tokenize(text).length });
  return embedding;
}

function documentToText(document) {
  return [
    document.error_code, document.module, document.title, document.description,
    document.business_context, ...(document.possible_causes || []),
    ...(document.diagnostic_steps || []), ...(document.recommended_actions || []),
    ...(document.related_transactions || []), ...(document.keywords || [])
  ].join(" ");
}

module.exports = { EMBEDDING_DIMENSION, embed, documentToText, tokenize };
