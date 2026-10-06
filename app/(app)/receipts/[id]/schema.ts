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
        // Whether the user changed this item's category in the form. The
        // submitted `categoryId` is only meaningful alongside it: without the
        // signal, a category filled in by a categorization run after the page
        // loaded would be overwritten by the stale form value and recorded as
        // a user decision.
        categoryTouched: z.boolean().default(false),
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
