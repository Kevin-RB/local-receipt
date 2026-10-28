import { z } from "zod";

/**
 * Output contracts for the chat tools. They are the single source of truth for
 * both the query result types and the shapes the UI renders: the AI SDK
 * validates a tool part's `output` against the tool's `outputSchema` on the
 * client, so a drifting query return type is a type error, not a silent
 * `undefined` in a table cell.
 *
 * Dates are receipt-local `YYYY-MM-DD` strings, not `Date`s — tool results
 * cross the network as JSON, so a `Date` here would be a type lie.
 */

export const categoryTotalSchema = z.object({
  category: z.string(),
  total: z.number(),
});
export const categoryTotalsSchema = z.array(categoryTotalSchema);
export type CategoryTotal = z.infer<typeof categoryTotalSchema>;

/**
 * The rows above, plus the overall total. Computing the sum in the query keeps
 * the headline figure exact: a model asked to add the rows up gets it wrong
 * (a real trace claimed $372.66 for rows summing to $373.16), so the number is
 * ours to produce and the tool row renders it.
 */
export const categorySpendSchema = z.object({
  categories: categoryTotalsSchema,
  total: z.number(),
});
export type CategorySpend = z.infer<typeof categorySpendSchema>;

export const merchantTotalSchema = z.object({
  merchant: z.string(),
  receipts: z.number(),
  total: z.number(),
});
export const merchantTotalsSchema = z.array(merchantTotalSchema);
export type MerchantTotal = z.infer<typeof merchantTotalSchema>;

/** The merchant rows plus their overall total, summed in the query rather than by the model. */
export const merchantSpendSchema = z.object({
  merchants: merchantTotalsSchema,
  total: z.number(),
});
export type MerchantSpend = z.infer<typeof merchantSpendSchema>;

export const lineItemMatchSchema = z.object({
  category: z.string().nullable(),
  date: z.iso.date().nullable(),
  dateLabel: z.string().nullable(),
  item: z.string(),
  kind: z.string(),
  lineTotal: z.number(),
  merchant: z.string().nullable(),
  receiptId: z.string(),
});

export const lineItemSearchSchema = z.object({
  count: z.number(),
  items: z.array(lineItemMatchSchema),
  total: z.number(),
});
export type LineItemMatch = z.infer<typeof lineItemMatchSchema>;
export type LineItemSearch = z.infer<typeof lineItemSearchSchema>;

export const receiptSummarySchema = z.object({
  date: z.iso.date().nullable(),
  dateLabel: z.string().nullable(),
  hasIntegrityWarning: z.boolean(),
  id: z.string(),
  merchant: z.string().nullable(),
  total: z.number().nullable(),
});
export const receiptSummariesSchema = z.array(receiptSummarySchema);
export type ReceiptSummary = z.infer<typeof receiptSummarySchema>;

export const receiptDetailSchema = z.object({
  date: z.iso.date().nullable(),
  dateLabel: z.string().nullable(),
  gst: z.number().nullable(),
  id: z.string(),
  items: z.array(
    z.object({
      kind: z.string(),
      lineTotal: z.number(),
      name: z.string(),
      quantity: z.number().nullable(),
      unitPrice: z.number().nullable(),
    })
  ),
  merchant: z.string().nullable(),
  paymentMethod: z.string().nullable(),
  subtotal: z.number().nullable(),
  total: z.number().nullable(),
});
export type ReceiptDetail = z.infer<typeof receiptDetailSchema>;
