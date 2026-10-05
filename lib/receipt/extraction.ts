import type { ReceiptInformationExtraction } from "@/lib/db/contract";
import { coerceLineItem } from "@/lib/receipt/line-item";
import type { LineItemMoney } from "@/lib/receipt/line-item";

export type ExtractedItems = ReceiptInformationExtraction["items"];

/**
 * Reads a negative line total as a discount. This is a judgement about what the
 * receipt printed — a receipt states a reduction as a negative amount and leaves
 * the deduction unlabelled — so it belongs to extraction and not to a save,
 * where the user has already picked the kind themselves.
 */
const readDeduction = <T extends LineItemMoney>(item: T): T =>
  item.lineTotal < 0 ? { ...item, kind: "discount" } : item;

/**
 * Applies the money-model coercion to extracted line items: a printed negative
 * amount is read as a discount and stored as a deduction, and a quantity the
 * receipt does not state becomes one.
 */
export const normalizeExtractedItems = (
  items: ExtractedItems
): ExtractedItems =>
  items.map((item) => ({
    ...coerceLineItem(readDeduction(item)),
    quantity: item.quantity ?? 1,
  }));
