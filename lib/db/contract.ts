import { z } from "zod/v4";

import { receiptExtractionInsertSchema } from "@/lib/db/schema/receipt";
import { receiptItemInsertSchema } from "@/lib/db/schema/receipt-item";

export const ReceiptInformationExtractionSchema =
  receiptExtractionInsertSchema.extend({
    items: z.array(receiptItemInsertSchema.omit({ id: true, receiptId: true })),
  });

export type ReceiptInformationExtraction = z.infer<
  typeof ReceiptInformationExtractionSchema
>;
