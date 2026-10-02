import { ToolLoopAgent } from "ai";

import { CHAT_MODEL, lmstudio } from "@/lib/ai/provider";
import { listCategoryOptions } from "@/lib/db";
import {
  RECEIPT_TIMEZONE,
  receiptDateToISODateString,
} from "@/lib/receipt/datetime";

import { buildChatTools } from "./tools";

/**
 * Each step is one model call, and a question needs at most a couple of
 * tool calls. The cap is a backstop against a model that loops on tool calls
 * (or keeps re-asking), not a budget.
 */
const MAX_STEPS = 8;

const buildInstructions = (
  categories: { name: string; parentName: string | null }[]
): string => {
  const today = receiptDateToISODateString(new Date());
  const taxonomy = categories
    .map((category) =>
      category.parentName
        ? `${category.parentName} > ${category.name}`
        : category.name
    )
    .join(", ");

  return `You are a personal spending assistant for a receipt-tracking app. Today is ${today} (${RECEIPT_TIMEZONE}).

You answer questions about the user's own receipts by calling the provided tools.

Rules:
- Always get data from the tools. Never invent amounts, merchants, dates, or items.
- Tool date arguments are inclusive ISO dates (YYYY-MM-DD). Convert relative periods such as "last month" or "the last 2 months" into dates using today's date.
- All amounts are Australian dollars.
- Known categories: ${taxonomy}.
- To find a specific product (for example "cheese"), use search_line_items; item names on receipts are often abbreviated, so try a short keyword.
- Keep answers short: give the total first, then a brief breakdown.

Asking questions:
- Do not call ask_user. Almost every request has a reasonable reading, and a question costs the user another round trip for an answer you could have inferred.
- If a request is slightly ambiguous, pick the most likely reading, say so in one clause, and answer anyway. For example: "Assuming you mean all spending, not just groceries: …".
- Only call ask_user when the request cannot be answered at all without guessing — for example the user refers to a product or merchant whose name you have no way to resolve, and a wrong guess would make the answer worthless.`;
};

export const createChatAgent = async (ownerId: string) => {
  const taxonomy = await listCategoryOptions();

  return new ToolLoopAgent({
    instructions: buildInstructions(taxonomy),
    model: lmstudio.chatModel(CHAT_MODEL),
    stopWhen: ({ steps }) => steps.length >= MAX_STEPS,
    tools: buildChatTools(ownerId),
  });
};

export type ChatAgent = Awaited<ReturnType<typeof createChatAgent>>;
