const { embed } = require("./embedder");
const { search } = require("./vectorStore");
const { resolveExactRecord } = require("./aliasResolver");

function preprocessQuery(query) {
  return String(query || "").trim().replace(/[-\s]+/g, " ").toLowerCase();
}

async function retrieve(query, limit = 5) {
  const preprocessedQuery = preprocessQuery(query);
  console.log("[rag:retriever] Query received", { query });
  console.log("[rag:retriever] Query after preprocessing", { preprocessedQuery });

  const exactMatch = await resolveExactRecord(query);
  console.log("[rag:retriever] Exact match result", exactMatch ? {
    matchType: exactMatch.matchType,
    id: exactMatch.document.id,
    errorCode: exactMatch.document.error_code,
    score: 1
  } : null);
  if (exactMatch) {
    console.log("[rag:retriever] Exact match selected", { matchType: exactMatch.matchType, alias: exactMatch.alias || null, id: exactMatch.document.id, errorCode: exactMatch.document.error_code });
    return [{ document: exactMatch.document, score: 1, vectorScore: 1, matchType: exactMatch.matchType, lexicalOverlap: 1 }];
  }

  const semanticMatches = await search(embed(preprocessedQuery), limit, preprocessedQuery);
  console.log("[rag:retriever] Semantic search result", {
    count: semanticMatches.length,
    documents: semanticMatches.map((item) => ({ id: item.document.id, errorCode: item.document.error_code, score: Number(item.score.toFixed(4)), vectorScore: Number(item.vectorScore.toFixed(4)) }))
  });

  return semanticMatches;
}

module.exports = { preprocessQuery, retrieve };
