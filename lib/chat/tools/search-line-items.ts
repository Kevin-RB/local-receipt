import { tool } from "ai";
import { z } from "zod";

import { lineItemSearchSchema } from "../output-schemas";
import { searchLineItems } from "../queries";
import { isoDateRange } from "./date-range";

export const search_line_items = (ownerId: string) =>
  tool({
    description:
      "Search the user's receipt line items by product-name keyword, optionally within a date range. Returns the matching items and their summed total.",
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
