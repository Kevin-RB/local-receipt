import { tool } from "ai";
import { z } from "zod";

import { receiptDetailSchema } from "../output-schemas";
import { receiptDetail } from "../queries";

export const receipt_detail = (ownerId: string) =>
  tool({
    description: "Get a single receipt with all of its line items.",
    execute: ({ receiptId }) => receiptDetail(ownerId, receiptId),
    inputSchema: z.object({
      receiptId: z
        .string()
        .describe(
          "A receipt id returned by list_receipts or search_line_items"
        ),
    }),
    outputSchema: receiptDetailSchema.nullable(),
  });
