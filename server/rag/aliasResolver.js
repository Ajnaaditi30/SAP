const fs = require("fs/promises");
const path = require("path");
const { logError } = require("../logging");

const ALIASES_FILE = path.resolve(__dirname, "..", "..", "knowledge_base", "error_aliases.json");
const KNOWLEDGE_BASE_FILE = path.resolve(__dirname, "..", "..", "knowledge_base", "sap_errors.json");

let aliasesPromise;
let documentsPromise;

// SAP message identifiers may be entered as "M7 021", "M7021", or in a
// longer error string. Spaces and punctuation are not significant for lookup.
function normalizeIdentifier(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function loadAliases() {
  if (!aliasesPromise) {
    console.info("[rag:knowledgeBase] stage=alias-load status=started");
    aliasesPromise = fs.readFile(ALIASES_FILE, "utf8").then((text) => {
      const aliases = JSON.parse(text);
      console.info("[rag:knowledgeBase] stage=alias-load status=completed", { aliasCount: Object.keys(aliases).length });
      return new Map(Object.entries(aliases).map(([alias, id]) => [normalizeIdentifier(alias), id]));
    }).catch((error) => {
      aliasesPromise = undefined;
      logError("rag:knowledge-base-alias-load", error);
      throw error;
    });
  }
  return aliasesPromise;
}

async function loadDocuments() {
  if (!documentsPromise) {
    console.info("[rag:knowledgeBase] stage=document-load status=started");
    documentsPromise = fs.readFile(KNOWLEDGE_BASE_FILE, "utf8").then(JSON.parse);
    documentsPromise = documentsPromise.then((documents) => {
      console.info("[rag:knowledgeBase] stage=document-load status=completed", { documentCount: documents.length });
      return documents;
    }).catch((error) => {
      documentsPromise = undefined;
      logError("rag:knowledge-base-document-load", error);
      throw error;
    });
  }
  return documentsPromise;
}

async function resolveAlias(query) {
  const normalizedQuery = normalizeIdentifier(query);
  console.info("[rag:aliasResolver] Alias lookup started", { identifierLength: normalizedQuery.length });
  if (!normalizedQuery) {
    console.info("[rag:aliasResolver] Resolution result", { matchType: "semantic", matchedAlias: null, documentId: null });
    return null;
  }

  const aliases = await loadAliases();
  const match = [...aliases.entries()]
    .filter(([alias]) => normalizedQuery.includes(alias))
    .sort(([left], [right]) => right.length - left.length)[0];
  if (!match) return null;

  const [, recordId] = match;
  const documents = await loadDocuments();
  const document = documents.find((item) => item.id === recordId);

  // An invalid alias must never produce a fabricated answer.
  if (document) {
    console.log("[rag:aliasResolver] Resolution result", { matchType: "exact-alias", matchedAlias: match[0], documentId: document.id });
    return { document, alias: match[0] };
  }

  console.log("[rag:aliasResolver] Resolution result", { matchType: "semantic", matchedAlias: match[0], documentId: null });
  return null;
}

async function resolveExactRecord(query) {
  const normalizedQuery = normalizeIdentifier(query);
  console.info("[rag:aliasResolver] Exact-resolution check", { identifierLength: normalizedQuery.length });
  if (!normalizedQuery) return null;

  const documents = await loadDocuments();
  const idMatch = documents.find((item) => normalizeIdentifier(item.id) === normalizedQuery);
  if (idMatch) {
    console.log("[rag:aliasResolver] Resolution result", { matchType: "exact-id", matchedAlias: null, documentId: idMatch.id });
    return { document: idMatch, matchType: "id" };
  }

  const aliasMatch = await resolveAlias(query);
  if (aliasMatch) return { ...aliasMatch, matchType: "alias" };

  const document = documents.find((item) => normalizeIdentifier(item.error_code) === normalizedQuery);
  if (document) {
    console.log("[rag:aliasResolver] Resolution result", { matchType: "exact-error-code", matchedAlias: null, documentId: document.id });
    return { document, matchType: "error_code" };
  }

  console.log("[rag:aliasResolver] Resolution result", { matchType: "semantic", matchedAlias: null, documentId: null });
  return null;
}

module.exports = { loadDocuments, normalizeIdentifier, resolveAlias, resolveExactRecord };
