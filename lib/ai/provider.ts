import { createOpenAI } from "@ai-sdk/openai";

const LM_STUDIO_URL = process.env.LM_STUDIO_URL ?? "http://localhost:1234/v1";
const LM_STUDIO_API_KEY = process.env.LM_STUDIO_API_KEY ?? "not-needed";

export const glmOrcProvider = createOpenAI({
  apiKey: LM_STUDIO_API_KEY,
  baseURL: LM_STUDIO_URL,
});

export const GLM_ORC_MODEL = process.env.GLM_ORC_MODEL ?? "glm-orc";
