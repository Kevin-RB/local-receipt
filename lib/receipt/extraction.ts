import type { ReceiptInformationExtraction } from "@/lib/db/contract";

export type ExtractedItems = ReceiptInformationExtraction["items"];

/**
 * Applies the money-model coercion to extracted line items: a negative line
 * total becomes a discount, and a quantity the receipt does not state becomes
 * one.
 */
export const normalizeExtractedItems = (
  items: ExtractedItems
): ExtractedItems =>
  items.map((item) => ({
    ...item,
    kind: item.lineTotal < 0 ? "discount" : item.kind,
    quantity: item.quantity ?? 1,
  }));
