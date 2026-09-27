import { tool } from "ai";
import { z } from "zod";

import {
  listReceiptSummaries,
  receiptDetail,
  searchLineItems,
  spendByCategory,
  spendByMerchant,
} from "./queries";

const isoDate = z.iso
  .date()
  .describe("An inclusive calendar date in ISO format (YYYY-MM-DD).");

export const buildChatTools = (ownerId: string) => ({
  listReceipts: tool({
    description:
      "List the user's receipts, optionally filtered by date range and merchant. Returns receipt ids for use with receiptDetail.",
    execute: ({ from, merchant, to }) =>
      listReceiptSummaries(ownerId, { from, merchant, to }),
    inputSchema: z.object({
      from: isoDate.optional(),
      merchant: z.string().optional(),
      to: isoDate.optional(),
    }),
  }),
  receiptDetail: tool({
    description: "Get a single receipt with all of its line items.",
    execute: ({ receiptId }) => receiptDetail(ownerId, receiptId),
    inputSchema: z.object({
      receiptId: z
        .string()
        .describe("A receipt id returned by listReceipts or searchLineItems"),
    }),
  }),
  searchLineItems: tool({
    description:
      "Search the user's receipt line items by product-name keyword, optionally within a date range. Returns the matching items and their summed total.",
    execute: ({ from, query, to }) =>
      searchLineItems(ownerId, { from, query, to }),
    inputSchema: z.object({
      from: isoDate.optional(),
      query: z
        .string()
        .describe("Keyword to match against item names, e.g. 'cheese'"),
      to: isoDate.optional(),
    }),
  }),
  spendByCategory: tool({
    description:
      "Total spend per category between two inclusive ISO dates, counting products only.",
    execute: ({ from, to }) => spendByCategory(ownerId, from, to),
    inputSchema: z.object({ from: isoDate, to: isoDate }),
  }),
  spendByMerchant: tool({
    description: "Total spend per merchant between two inclusive ISO dates.",
    execute: ({ from, to }) => spendByMerchant(ownerId, from, to),
    inputSchema: z.object({ from: isoDate, to: isoDate }),
  }),
});

export type ChatTools = ReturnType<typeof buildChatTools>;
export type ChatToolName = keyof ChatTools & string;
