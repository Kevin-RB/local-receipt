import { z } from "zod/v4";

export const Merchant = z.strictObject({
  abn: z.string().optional(),
  address: z.string().optional(),
  name: z.string(),
  store_id: z.string().optional(),
});
export type Merchant = z.infer<typeof Merchant>;

export const Transaction = z.strictObject({
  datetime: z.string().optional(),
  receipt_number: z.string().optional(),
});
export type Transaction = z.infer<typeof Transaction>;

export const ReceiptItem = z.strictObject({
  line_total: z.number(),
  name: z.string(),
  quantity: z.number().optional(),
  unit_price: z.number().optional(),
});
export type ReceiptItem = z.infer<typeof ReceiptItem>;

export const Totals = z.strictObject({
  gst: z.number().optional(),
  subtotal: z.number().optional(),
  total: z.number(),
});
export type Totals = z.infer<typeof Totals>;

export const Payment = z.strictObject({
  method: z.string().optional(),
});
export type Payment = z.infer<typeof Payment>;

export const ReceiptExtraction = z.strictObject({
  items: z.array(ReceiptItem),
  merchant: Merchant,
  payment: Payment,
  totals: Totals,
  transaction: Transaction,
});
export type ReceiptExtraction = z.infer<typeof ReceiptExtraction>;
