import type { ReceiptSelect } from "@/lib/db/schema/receipt";

export type SpendingInput = Pick<
  ReceiptSelect,
  "total" | "transactionDateTime"
>;

export interface SpendingBucket {
  label: string;
  total: number;
}

export type SpendingGranularity = "day" | "month";

export interface SpendingPeriod {
  granularity: SpendingGranularity;
  count: number;
}

const roundToCents = (value: number): number => Math.round(value * 100) / 100;

const spendingRange = (
  period: SpendingPeriod,
  today: Temporal.PlainDate
): string[] => {
  const range: string[] = [];
  if (period.granularity === "day") {
    const start = today.subtract({ days: period.count - 1 });
    for (
      let day = start;
      Temporal.PlainDate.compare(day, today) <= 0;
      day = day.add({ days: 1 })
    ) {
      range.push(day.toString());
    }
  } else {
    const end = today.toPlainYearMonth();
    const start = end.subtract({ months: period.count - 1 });
    for (
      let month = start;
      Temporal.PlainYearMonth.compare(month, end) <= 0;
      month = month.add({ months: 1 })
    ) {
      range.push(month.toString());
    }
  }
  return range;
};

export const sumSpending = (
  receipts: SpendingInput[],
  period: SpendingPeriod,
  today = Temporal.Now.plainDateISO()
): SpendingBucket[] => {
  const timeZoneId = Temporal.Now.timeZoneId();
  const totals = new Map<string, number>();

  for (const receipt of receipts) {
    if (receipt.total === null || receipt.transactionDateTime === null) {
      continue;
    }
    const zoned = receipt.transactionDateTime
      .toTemporalInstant()
      .toZonedDateTimeISO(timeZoneId);
    const plainDate = zoned.toPlainDate();
    const key =
      period.granularity === "day"
        ? plainDate.toString()
        : plainDate.toPlainYearMonth().toString();
    totals.set(key, (totals.get(key) ?? 0) + receipt.total);
  }

  const range = spendingRange(period, today);

  return range.map((key) => ({
    label: key,
    total: roundToCents(totals.get(key) ?? 0),
  }));
};
