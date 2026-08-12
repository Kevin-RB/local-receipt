import z from "zod";

import {
  Merchant,
  Payment,
  Totals,
  Transaction,
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
  merchant: Merchant.extend({ name: z.string().min(1) }),
  payment: Payment,
  receiptId: z.string().uuid(),
  totals: Totals.extend({
    gst: money.optional(),
    subtotal: money.optional(),
    total: money,
  }),
  transaction: Transaction,
});

export type UpdateReceiptInput = z.infer<typeof updateReceiptSchema>;
