export interface IntegrityItems {
  lineTotal: number;
}

export interface IntegrityTotals {
  total: number | undefined;
}

export const CENTS_EPSILON = 0.01;

export const computeIntegrityWarning = (
  items: IntegrityItems[],
  totals: IntegrityTotals | null | undefined
): boolean => {
  if (!totals || totals.total === undefined || totals.total === null) {
    return false;
  }

  const itemsSum = items.reduce((sum, item) => sum + item.lineTotal, 0);

  if (Number.isNaN(itemsSum) || Number.isNaN(totals.total)) {
    return true;
  }

  const diff = Math.abs(itemsSum - totals.total);

  return diff >= CENTS_EPSILON;
};
