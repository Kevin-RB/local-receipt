/** Formats a tool-result amount for display; non-finite values render as an em dash. */
export const formatAmount = (value: number | null | undefined): string => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("en-AU", {
    currency: "AUD",
    style: "currency",
  }).format(value);
};

const dayFormatter = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/**
 * Tool results carry receipt-local `YYYY-MM-DD` dates. Parse as UTC so the
 * browser's own timezone can never shift the day.
 */
export const formatDay = (isoDate: string | null | undefined): string => {
  if (!isoDate) {
    return "—";
  }

  const parsed = new Date(`${isoDate}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return dayFormatter.format(parsed);
};
