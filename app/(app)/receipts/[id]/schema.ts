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

/** An amount the receipt states: never negative, except a discount's unit price. */
const money = z.number().min(0);

/**
 * The unit price of a line item. Unlike quantity and the receipt totals, this
 * may be negative — a discount's unit price is negated alongside its line total
 * so `quantity × unitPrice` still reconciles, and the sign follows the kind
 * rather than the input. Rejecting it here would make a stored discount
 * unsaveable.
 */
const unitPrice = z.number();

export const updateReceiptSchema = z.object({
  items: z.array(
    receiptItemInsertSchema.omit({ id: true, receiptId: true }).extend({
      kind: lineItemKindEnum.default("product"),
      lineTotal: z.number(),
      quantity: money.nullable().optional(),
      unitPrice: unitPrice.nullable().optional(),
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
