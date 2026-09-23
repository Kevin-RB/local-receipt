import { z } from "zod/v4";

import { receiptNestedSchema } from "@/lib/db/schema/receipt";
import {
  lineItemKindEnum,
  receiptItemInsertSchema,
} from "@/lib/db/schema/receipt-item";

export const receiptExtractionItemSchema = receiptItemInsertSchema
  .omit({ id: true, receiptId: true })
  .extend({
    kind: lineItemKindEnum.default("product"),
    quantity: z.number().nullable().default(1),
  });

export const ReceiptInformationExtractionSchema = receiptNestedSchema.extend({
  items: z.array(receiptExtractionItemSchema),
});

export type ReceiptInformationExtraction = z.infer<
  typeof ReceiptInformationExtractionSchema
>;
