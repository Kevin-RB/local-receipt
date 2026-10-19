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
  // The hierarchy is kept — without it the model invents which subcategories
  // belong to a top-level category, and attributes them wrongly — but never as
  // a `Parent > Child` path, which it echoed verbatim into its prose.
  const groups = new Map<string, string[]>();
  for (const { name, parentName } of categories) {
    const group = parentName ?? name;
    const children = groups.get(group) ?? [];
    groups.set(group, parentName === null ? children : [...children, name]);
  }
  const taxonomy = [...groups]
    .map(([group, children]) =>
      children.length > 0 ? `${group}: ${children.join(", ")}` : group
    )
    .join("; ");

  return `You are a personal spending assistant for a receipt-tracking app. Today is ${today} (${RECEIPT_TIMEZONE}).

You answer questions about the user's own receipts by calling the provided tools.

Rules:
- Always get data from the tools. Never invent amounts, merchants, dates, or items.
- Tool date arguments are inclusive ISO dates (YYYY-MM-DD). Convert relative periods such as "last month" or "the last 2 months" into dates using today's date.
- All amounts are Australian dollars.
- Known categories, as "top-level: its subcategories": ${taxonomy}.
- To find a specific product (for example "cheese"), use search_line_items; item names on receipts are often abbreviated, so try a short keyword.
- Spend breaks down by subcategory by default. For a question about a whole top-level category (for example "how much did I spend on groceries?"), pass groupBy "category" to spend_by_category, so the group total comes from the query. Never add subcategory rows up yourself.
- To narrow the breakdown to a single category — a breakdown of one top-level category, or the total for one subcategory — pass that category's name as the category argument, and the table then shows only it. Never pick rows out of a broader breakdown yourself.
- In prose, name a category by its own name ("Meat & Seafood"), never as a top-level and subcategory pair.
- The tools render their results to the user as a table or list, so those figures are already on screen. Never reproduce a table in your reply: no markdown table, no bullet per row, no re-listing of the amounts it shows.
- A tool value that nothing on screen shows — a receipt's GST or subtotal, say — is the one thing prose should state; nowhere else displays it.
- Reply in prose only, adding what the table cannot show, in two or three sentences at most: where the spending is concentrated, the largest category or merchant, or the shape of the data — for example that nearly all of it sits in one category.
- Never compute new numbers from the table: no sums, averages, or percentages. State only figures a tool returned; the table is already the source of them.
- If you have nothing to add beyond the table, say so in one short sentence. Do not pad.

Asking questions:
- When a request is missing something you need before you can run the right tool — most often the time period ("breakdown by category" with no dates), or which of several things the user means — call ask_user first rather than assuming. One question, three short and distinct choices fitted to the request (for a period: "This month", "Last 3 months", "This year"). Take the user's answer and continue.
- When the request already carries what you need ("breakdown by category this year"), do not ask — answer directly.</think><tool_call>edit<arg_key>newString</arg_key><arg_value>Asking questions:
- When a request is missing something you need before you can run the right tool — most often the time period ("breakdown by category" with no dates), or which of several things the user means — call ask_user first rather than assuming. One question, three short and distinct choices fitted to the request (for a period: "This month", "Last 3 months", "This year"). Take the user's answer and continue.
- When the request already carries what you need ("breakdown by category this year"), do not ask — answer directly.
- Only when the missing detail would not change any tool call — a mere phrasing ambiguity, two words for the same thing — pick the most likely reading, say so in one clause, and answer anyway.`;
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
