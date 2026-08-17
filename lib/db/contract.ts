import { z } from "zod/v4";

import { receiptNestedSchema } from "@/lib/db/schema/receipt";
import { receiptItemInsertSchema } from "@/lib/db/schema/receipt-item";

export const ReceiptInformationExtractionSchema = receiptNestedSchema.extend({
  items: z.array(receiptItemInsertSchema.omit({ id: true, receiptId: true })),
});

export type ReceiptInformationExtraction = z.infer<
  typeof ReceiptInformationExtractionSchema
>;
