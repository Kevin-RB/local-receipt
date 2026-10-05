import type { ReceiptInformationExtraction } from "@/lib/db/contract";
import { normalizeLineItems } from "@/lib/receipt/line-item";

export type ExtractedItems = ReceiptInformationExtraction["items"];

/**
 * Applies the money-model coercion to extracted line items: a discount is a
 * negative line total, and a quantity the receipt does not state becomes one.
 */
export const normalizeExtractedItems = (
  items: ExtractedItems
): ExtractedItems =>
  normalizeLineItems(items).map((item) => ({
    ...item,
    quantity: item.quantity ?? 1,
  }));
