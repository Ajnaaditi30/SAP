const fs = require("fs/promises");
const path = require("path");
const { EMBEDDING_DIMENSION, documentToText, tokenize } = require("./embedder");
const { logError } = require("../logging");

const INDEX_FILE = path.resolve(__dirname, "..", "..", "embeddings", "sap_errors.faiss");
const METADATA_FILE = path.resolve(__dirname, "..", "..", "embeddings", "sap_errors.metadata.json");
const KNOWLEDGE_BASE_FILE = path.resolve(__dirname, "..", "..", "knowledge_base", "sap_errors.json");
const STOP_WORDS = new Set(["the", "and", "for", "with", "this", "that", "what", "when", "where", "why", "how", "are", "was", "were", "from", "into", "today", "about", "there", "have", "has", "not"]);

function inferModule(query) {
  const value = query.toUpperCase();
  if (/(GOODS MOVEMENT|STOCK DEFICIT|MATERIAL|PURCHASE ORDER|GR POSTING)/.test(value)) return "MM";
  if (/(INVOICE POSTING|FINANCIAL POSTING|G\/L|GENERAL LEDGER)/.test(value)) return "FI";
  if (/(RFC|SM59|SMGW|GATEWAY|WORK PROCESS|KERNEL)/.test(value)) return "BASIS";
  if (/\b(ST22|DUMP|ABAP|BADI|USER EXIT)\b/.test(value)) return "ABAP";
  if (/\b(SU53|PFCG|AUTHORIZATION)\b/.test(value)) return "Authorization";
  return ["MM", "SD", "FI", "CO", "PP", "QM", "PM", "WM"].find((module) => new RegExp(`\\b${module}\\b`).test(value));
}

function cosineSimilarity(left, right) {
  return left.reduce((sum, value, index) => sum + value * right[index], 0);
}

async function loadVectorStore() {
  console.info("[rag:vectorStore] stage=load status=started");
  try {
    const [{ default: faiss }, metadataText, knowledgeBaseText] = await Promise.all([
      import("faiss-node"), fs.readFile(METADATA_FILE, "utf8"), fs.readFile(KNOWLEDGE_BASE_FILE, "utf8")
    ]);
    let metadata = JSON.parse(metadataText);
    const documents = JSON.parse(knowledgeBaseText);
    let index;

    if (JSON.stringify(metadata.documents) !== JSON.stringify(documents)) {
      console.info("[rag:vectorStore] Knowledge base changed; rebuilding FAISS index", { previousDocumentCount: metadata.documents.length, documentCount: documents.length });
      index = new faiss.IndexFlatIP(EMBEDDING_DIMENSION);
      for (const document of documents) index.add(embed(documentToText(document)));
      metadata = { version: 1, dimension: EMBEDDING_DIMENSION, createdAt: new Date().toISOString(), documents };
      await fs.mkdir(path.dirname(INDEX_FILE), { recursive: true });
      index.write(INDEX_FILE);
      await fs.writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2));
    } else {
      index = faiss.IndexFlatIP.read(INDEX_FILE);
    }

    if (metadata.dimension !== EMBEDDING_DIMENSION) throw new Error("Embedding index dimension does not match the configured embedder.");
    console.info("[rag:vectorStore] stage=load status=completed", { documentCount: metadata.documents.length });
    return { index, metadata };
  } catch (error) {
    logError("rag:vector-store-load", error);
    throw error;
  }
}

async function search(queryVector, limit = 5, query = "") {
  console.info("[rag:vectorStore] stage=search status=started", { queryLength: query.length });
  const { index, metadata } = await loadVectorStore();
  // FAISS provides the candidate set; lexical overlap then makes error-code
  // queries (for example RFC_ERROR_COMMUNICATION) robust to short inputs.
  const result = index.search(queryVector, metadata.documents.length);
  console.info("[rag:vectorStore] FAISS search completed", { candidateCount: result.labels.length });
  const queryTokens = new Set(tokenize(query).filter((token) => token.length > 2 && !STOP_WORDS.has(token)));
  const inferredModule = inferModule(query);
  const ranked = result.labels
    .map((label, position) => {
      const document = metadata.documents[label];
      const overlapFor = (value) => {
        const tokens = new Set(tokenize(value));
        return [...queryTokens].filter((token) => tokens.has(token)).length / Math.max(queryTokens.size, 1);
      };
      const keywordOverlap = overlapFor((document.keywords || []).join(" "));
      const titleOverlap = overlapFor(document.title);
      const descriptionOverlap = overlapFor(document.description);
      const moduleOverlap = overlapFor(document.module);
      const overlap = overlapFor(documentToText(document));
      const moduleBoost = document.module === inferredModule ? 0.2 : 0;
      const scenarioBoost = inferredModule === "MM" && /QUANTITY_INCONSISTENT/.test(document.error_code) ? 0.15 : 0;
      return {
        document,
        vectorScore: result.distances[position],
        lexicalOverlap: overlap,
        score: (result.distances[position] * 0.25) + (keywordOverlap * 0.25) + (titleOverlap * 0.2) + (descriptionOverlap * 0.15) + (moduleOverlap * 0.15) + moduleBoost + scenarioBoost
      };
    })
    .filter((item) => item.document)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);

  console.info("[rag:vectorStore] Search ranking completed", {
    queryLength: query.length,
    queryTokenCount: queryTokens.size,
    inferredModule: inferredModule || null,
    candidates: ranked.length,
    topMatch: ranked[0]?.document.id || null,
    topScore: ranked[0] ? Number(ranked[0].score.toFixed(4)) : null
  });
  return ranked;
}

module.exports = { INDEX_FILE, METADATA_FILE, cosineSimilarity, search };
