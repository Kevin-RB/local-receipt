import type { LineItemKind } from "@/lib/db/schema/receipt-item";

export interface ReconcileItem {
  kind: LineItemKind;
  lineTotal: number;
}

export interface ReconcileTotals {
  gst?: number | null;
  subtotal?: number | null;
  total?: number | null;
}

export interface Reconciliation {
  /** Sum of every non-surcharge line, including negative discounts. */
  productsSum: number;
  /** Sum of surcharge lines. */
  surchargesSum: number;
  /** productsSum + surchargesSum: the amount the line items add up to. */
  itemsSum: number;
  /** total - itemsSum. Positive when the stated total is higher. */
  delta: number;
  /** True when delta is within one cent of zero (or there is no total). */
  matches: boolean;
}

export const CENTS_EPSILON = 0.01;

export const reconcile = (
  items: ReconcileItem[],
  totals?: ReconcileTotals | null
): Reconciliation => {
  let productsSum = 0;
  let surchargesSum = 0;

  for (const item of items) {
    if (item.kind === "surcharge") {
      surchargesSum += item.lineTotal;
    } else {
      productsSum += item.lineTotal;
    }
  }

  const itemsSum = productsSum + surchargesSum;
  const total = totals?.total;

  if (total === undefined || total === null) {
    return { delta: 0, itemsSum, matches: true, productsSum, surchargesSum };
  }

  const delta = total - itemsSum;

  return {
    delta,
    itemsSum,
    matches: Math.abs(delta) < CENTS_EPSILON,
    productsSum,
    surchargesSum,
  };
};
