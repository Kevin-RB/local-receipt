import type { ReceiptSelect } from "@/lib/db/schema/receipt";

export type SpendingInput = Pick<
  ReceiptSelect,
  "total" | "transactionDateTime"
>;

export interface DailySpending {
  label: string;
  total: number;
}

const roundToCents = (value: number): number => Math.round(value * 100) / 100;

export const sumDailySpending = (
  receipts: SpendingInput[],
  today = Temporal.Now.plainDateISO(),
  days = 30
): DailySpending[] => {
  const timeZoneId = Temporal.Now.timeZoneId();
  const start = today.subtract({ days: days - 1 });
  const totals = new Map<string, number>();

  for (const receipt of receipts) {
    if (receipt.total === null || receipt.transactionDateTime === null) {
      continue;
    }
    const key = receipt.transactionDateTime
      .toTemporalInstant()
      .toZonedDateTimeISO(timeZoneId)
      .toPlainDate()
      .toString();
    totals.set(key, (totals.get(key) ?? 0) + receipt.total);
  }

  const range: string[] = [];
  for (
    let day = start;
    Temporal.PlainDate.compare(day, today) <= 0;
    day = day.add({ days: 1 })
  ) {
    range.push(day.toString());
  }

  return range.map((key) => ({
    label: key,
    total: roundToCents(totals.get(key) ?? 0),
  }));
};
