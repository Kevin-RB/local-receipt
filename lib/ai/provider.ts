import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const LM_STUDIO_URL = process.env.LM_STUDIO_URL ?? "http://localhost:1234/v1";

export const lmstudio = createOpenAICompatible({
  baseURL: LM_STUDIO_URL,
  name: "lmstudio",
});

export const ORC_MODEL = process.env.ORC_MODEL ?? "glm-ocr";

export const PARSE_MODEL = process.env.PARSE_MODEL ?? "google/gemma-4-e4b";
