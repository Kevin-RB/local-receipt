import { z } from "zod";

import {
  merchantSchema,
  paymentSchema,
  totalsSchema,
  transactionSchema,
} from "@/lib/db/schema/receipt";
import { receiptItemInsertSchema } from "@/lib/db/schema/receipt-item";

const money = z.number().min(0);

export const updateReceiptSchema = z.object({
  items: z.array(
    receiptItemInsertSchema.omit({ id: true, receiptId: true }).extend({
      lineTotal: money,
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
