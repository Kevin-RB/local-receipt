import type { ReceiptItemSelect } from "@/lib/db/schema/receipt-item";

/**
 * The money a line item states: the amount it contributes to the total, plus
 * the per-unit amount that amount is made of. Derived from the table so the
 * field definitions live in one place.
 */
export type LineItemMoney = Pick<ReceiptItemSelect, "kind" | "lineTotal"> &
  Partial<Pick<ReceiptItemSelect, "unitPrice">>;

/**
 * `Math.abs` first so the sign is decided by the kind, not by what the caller
 * typed. A zero stays a plain `0`: negating it would produce `-0`, which prints
 * as `-0.00` and reads as a discount of minus nothing. A non-finite amount
 * passes through as itself rather than becoming a second flavour of `NaN`.
 */
const asDeduction = (amount: number) => {
  if (!Number.isFinite(amount)) {
    return amount;
  }

  const magnitude = Math.abs(amount);
  return magnitude === 0 ? 0 : -magnitude;
};

/**
 * Applies the money-model invariant from ADR-0007: a discount is a line item
 * of kind `discount` carrying a negative line total, so it removes from the
 * total instead of adding to it.
 *
 * The kind decides the sign, so this coerces in one direction only — a discount
 * is negated whatever sign it arrives with. A negative amount is *not* read back
 * as a discount here: that is a judgement about what a receipt printed, so it
 * belongs to the extraction path (`normalizeExtractedItems`), not to a save where
 * the user has already chosen the kind. Idempotent either way, so running it
 * twice is the same as running it once.
 */
export const coerceLineItem = <T extends LineItemMoney>(item: T): T => {
  if (item.kind !== "discount") {
    return item;
  }

  const lineTotal = asDeduction(item.lineTotal);

  // Only touch `unitPrice` when the item states one: assigning `undefined`
  // would add the key, and the extraction contract treats an unprinted unit
  // price as absent rather than present-and-empty. Negating it alongside the
  // line total is what keeps quantity × unit price reconciling to the total.
  return typeof item.unitPrice === "number"
    ? { ...item, lineTotal, unitPrice: asDeduction(item.unitPrice) }
    : { ...item, lineTotal };
};

export const normalizeLineItems = <T extends LineItemMoney>(
  items: readonly T[]
): T[] => items.map(coerceLineItem);
