import { tool } from "ai";
import { z } from "zod";

/**
 * No `execute`: this tool is completed by the user in the UI. The client calls
 * `addToolOutput` with the answers, which re-sends the thread and lets the
 * agent continue — see `sendAutomaticallyWhen` in `components/chat/chat.tsx`.
 */
export const ask_user = tool({
  description:
    "Ask the user clarifying questions when their request is ambiguous — for example an unclear period, an ambiguous merchant, or a product that could be several things. Provide one or more questions, each with exactly 3 short, distinct answer choices. The user can also answer in their own words. Prefer answering directly whenever the request is unambiguous; do not ask questions just to be thorough.",
  inputSchema: z.object({
    questions: z
      .array(
        z.object({
          choices: z
            .array(z.string())
            .length(3)
            .describe("Exactly three short answer choices"),
          question: z.string().describe("The question to ask"),
        })
      )
      .min(1)
      .describe("The questions to ask the user"),
  }),
  outputSchema: z
    .array(z.object({ answer: z.string(), question: z.string() }))
    .describe("The user's answer to each question"),
});
