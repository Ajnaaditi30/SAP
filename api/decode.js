import ragService from "../server/rag/service.js";

const { decodeWithRag, emptyResponse } = ragService;
const MAX_INPUT_LENGTH = 4000;
const MIN_INPUT_LENGTH = 4;

const validateErrorInput = (value) => {
  if (typeof value !== "string") {
    return "Error text must be a string.";
  }

  const error = value.trim();

  if (!error) {
    return "Please provide an SAP error to decode.";
  }

  if (error.length < MIN_INPUT_LENGTH) {
    return "Please enter a more complete SAP error message.";
  }

  if (error.length > MAX_INPUT_LENGTH) {
    return `Please keep the SAP error under ${MAX_INPUT_LENGTH} characters.`;
  }

  return null;
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json(emptyResponse("Method not allowed. Use POST."));
  }

  const validationError = validateErrorInput(req.body?.error);

  if (validationError) {
    return res.status(400).json(emptyResponse(validationError));
  }

  try {
    const result = await decodeWithRag(req.body.error.trim());
    return res.status(200).json(result);
  } catch (error) {
    console.error("[decode] RAG retrieval failed", error.stack || error);
    return res.status(500).json(emptyResponse());
  }
}
