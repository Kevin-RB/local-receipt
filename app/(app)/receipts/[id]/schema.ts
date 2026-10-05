import { z } from "zod";

import {
  merchantSchema,
  paymentSchema,
  totalsSchema,
  transactionSchema,
} from "@/lib/db/schema/receipt";
import {
  lineItemKindEnum,
  receiptItemInsertSchema,
} from "@/lib/db/schema/receipt-item";

const money = z.number().min(0);

export const updateReceiptSchema = z.object({
  items: z.array(
    receiptItemInsertSchema
      .omit({ categorySource: true, id: true, receiptId: true })
      .extend({
        // Named `itemId` rather than `id` because `useFieldArray` generates its
        // own `id` for each row and overwrites the field of that name, so a
        // payload key of `id` would be ambiguous.
        itemId: z.uuid({ message: "Invalid line item ID" }).optional(),
        kind: lineItemKindEnum.default("product"),
        lineTotal: z.number(),
        quantity: money.nullable().optional(),
        unitPrice: money.nullable().optional(),
      })
  ),
  merchant: merchantSchema.extend({ name: z.string().min(1) }),
  payment: paymentSchema,
  receiptId: z.uuid({ message: "Invalid receipt ID" }),
  totals: totalsSchema.extend({
    gst: money.optional(),
    subtotal: money.optional(),
    total: money,
  }),
  transaction: transactionSchema,
});

export type UpdateReceiptInput = z.infer<typeof updateReceiptSchema>;
