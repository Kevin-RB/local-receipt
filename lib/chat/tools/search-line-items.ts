import { tool } from "ai";
import { z } from "zod";

import { lineItemSearchSchema } from "../output-schemas";
import { searchLineItems } from "../queries";
import { isoDateRange } from "./date-range";

export const search_line_items = (ownerId: string) =>
  tool({
    description:
      "Search the user's receipt line items by product-name keyword, optionally within a date range. Use for product questions — 'did I buy yogurt in the last week?', 'how much did I spend on chicken in the last two weeks?', 'when did I last buy milk?' — and pass the user's own words: receipt names are abbreviated and the search tolerates near-misses. Dates are optional, so search all time when the user gives no period rather than asking for one. Returns the matching items and their summed total, counting products only (up to 25 matches; the total covers them).",
    execute: ({ from, query, to }) =>
      searchLineItems(ownerId, { from, query, to }),
    inputSchema: z.object({
      ...isoDateRange,
      query: z
        .string()
        .describe("Keyword to match against item names, e.g. 'cheese'"),
    }),
    outputSchema: lineItemSearchSchema,
  });
