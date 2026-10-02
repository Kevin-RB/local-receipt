export type RangeKey = "30-days" | "2-months" | "3-months";

export const RANGE_LABELS: Record<RangeKey, string> = {
  "2-months": "2 months",
  "3-months": "3 months",
  "30-days": "30 days",
};

export const RANGE_MONTHS: Record<RangeKey, number | null> = {
  "2-months": 2,
  "3-months": 3,
  "30-days": null,
};

export const RANGE_ITEMS = Object.entries(RANGE_LABELS).map(
  ([value, label]) => ({
    label,
    value,
  })
);

export const currencyFormatter = new Intl.NumberFormat("en-AU", {
  currency: "AUD",
  style: "currency",
});
