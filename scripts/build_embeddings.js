/* Build the local FAISS index. Run: npm run rag:build */
const fs = require("fs/promises");
const path = require("path");
const faiss = require("faiss-node");
const { EMBEDDING_DIMENSION, embed, documentToText } = require("../server/rag/embedder");
const { INDEX_FILE, METADATA_FILE } = require("../server/rag/vectorStore");

async function main() {
  const sourceFile = path.resolve(__dirname, "..", "knowledge_base", "sap_errors.json");
  const documents = JSON.parse(await fs.readFile(sourceFile, "utf8"));
  if (!Array.isArray(documents) || !documents.length) throw new Error("sap_errors.json must contain at least one document.");

  const vectors = documents.map((document) => embed(documentToText(document)));
  const index = new faiss.IndexFlatIP(EMBEDDING_DIMENSION);
  for (const vector of vectors) index.add(vector);

  await fs.mkdir(path.dirname(INDEX_FILE), { recursive: true });
  index.write(INDEX_FILE);
  await fs.writeFile(METADATA_FILE, JSON.stringify({
    version: 1,
    dimension: EMBEDDING_DIMENSION,
    createdAt: new Date().toISOString(),
    documents
  }, null, 2));
  console.log(`Indexed ${documents.length} SAP documents in ${path.relative(process.cwd(), INDEX_FILE)}`);
}

main().catch((error) => { console.error("Embedding build failed:", error.message); process.exitCode = 1; });
