import { generateText } from "ai";

import { GLM_ORC_MODEL, glmOrcProvider } from "./provider";

export const TRANSCRIPTION_PROMPT =
  "Transcribe the text from this receipt image. Preserve line breaks, item names, prices, totals, dates, merchant name, and any other visible text as faithfully as possible. Return only the raw transcribed text.";

export const transcribeReceiptImage = async (
  base64: string,
  mimeType: string
): Promise<string> => {
  const dataUrl = `data:${mimeType};base64,${base64}`;
  const { text } = await generateText({
    messages: [
      {
        content: [
          { text: TRANSCRIPTION_PROMPT, type: "text" },
          { image: dataUrl, type: "image" },
        ],
        role: "user",
      },
    ],
    model: glmOrcProvider(GLM_ORC_MODEL),
  });
  return text;
};
