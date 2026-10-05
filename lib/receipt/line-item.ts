import type { LineItemKind } from "@/lib/db/schema/receipt-item";

/**
 * The money a line item states: the amount it contributes to the total, plus
 * the per-unit amount that amount is made of.
 */
export interface LineItemMoney {
  kind: LineItemKind;
  lineTotal: number;
  unitPrice?: number | null;
}

/**
 * `Math.abs` first so the sign is decided by the kind, not by what the caller
 * typed. A zero stays a plain `0`: negating it would produce `-0`, which prints
 * as `-0.00` and reads as a discount of minus nothing.
 */
const asDeduction = (amount: number) => {
  const magnitude = Math.abs(amount);
  return magnitude === 0 ? 0 : -magnitude;
};

/**
 * Applies the money-model invariant from ADR-0007: a discount is a line item
 * of kind `discount` carrying a negative line total, so it removes from the
 * total instead of adding to it.
 *
 * A negative line total is read as a discount whatever kind it arrived with,
 * and a line item whose kind is `discount` is negated whatever sign it arrived
 * with. Both reads are idempotent, so running the coercion twice is the same as
 * running it once — which is what lets it sit on both the extraction and the
 * edit path without the second pass undoing the first.
 */
export const normalizeLineItems = <T extends LineItemMoney>(
  items: readonly T[]
): T[] =>
  items.map((item) => {
    const kind = item.lineTotal < 0 ? "discount" : item.kind;

    if (kind !== "discount") {
      return item;
    }

    const lineTotal = asDeduction(item.lineTotal);

    // Only touch `unitPrice` when the item states one: assigning `undefined`
    // would add the key, and the extraction contract treats an unprinted unit
    // price as absent rather than present-and-empty. Negating it alongside the
    // line total is what keeps quantity × unit price reconciling to the total.
    return typeof item.unitPrice === "number"
      ? { ...item, kind, lineTotal, unitPrice: asDeduction(item.unitPrice) }
      : { ...item, kind, lineTotal };
  });
