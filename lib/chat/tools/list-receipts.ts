import { tool } from "ai";
import { z } from "zod";

import { receiptSummariesSchema } from "../output-schemas";
import { listReceiptSummaries } from "../queries";
import { isoDateRange } from "./date-range";

export const list_receipts = (ownerId: string) =>
  tool({
    description:
      "List the user's receipts, optionally filtered by date range and merchant. Returns receipt ids for use with receipt_detail.",
    execute: ({ from, merchant, to }) =>
      listReceiptSummaries(ownerId, { from, merchant, to }),
    inputSchema: z.object({
      ...isoDateRange,
      merchant: z.string().optional(),
    }),
    outputSchema: receiptSummariesSchema,
  });
