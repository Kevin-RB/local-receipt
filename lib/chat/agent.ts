import { ToolLoopAgent } from "ai";

import { CHAT_MODEL, lmstudio } from "@/lib/ai/provider";
import { listCategoryOptions } from "@/lib/db";
import {
  RECEIPT_TIMEZONE,
  receiptDateToISODateString,
} from "@/lib/receipt/datetime";

import { buildChatTools } from "./tools";

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
- Never ask clarifying questions. If the user gives no date range, assume the last 30 days.
- Tool date arguments are inclusive ISO dates (YYYY-MM-DD). Convert relative periods such as "last month" or "the last 2 months" into dates using today's date.
- All amounts are Australian dollars.
- Known categories: ${taxonomy}.
- To find a specific product (for example "cheese"), use searchLineItems; item names on receipts are often abbreviated, so try a short keyword.
- Keep answers short: give the total first, then a brief breakdown.`;
};

export const createChatAgent = async (ownerId: string) => {
  const taxonomy = await listCategoryOptions();

  return new ToolLoopAgent({
    instructions: buildInstructions(taxonomy),
    model: lmstudio.chatModel(CHAT_MODEL),
    tools: buildChatTools(ownerId),
  });
};

export type ChatAgent = Awaited<ReturnType<typeof createChatAgent>>;
