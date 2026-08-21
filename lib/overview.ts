import type { ReceiptSelect } from "@/lib/db/schema/receipt";

export type SpendingInput = Pick<
  ReceiptSelect,
  "total" | "transactionDateTime"
>;

export type MerchantSpendingInput = Pick<
  ReceiptSelect,
  "total" | "transactionDateTime" | "merchantName"
>;

export type IntegrityInput = Pick<ReceiptSelect, "hasIntegrityWarning">;

export interface SpendingBucket {
  label: string;
  total: number;
}

const roundToCents = (value: number): number => Math.round(value * 100) / 100;

export const windowDays = (today: Temporal.PlainDate, months: number): number =>
  today.since(today.subtract({ months })).days + 1;

export const sumDailySpending = (
  receipts: SpendingInput[],
  days: number,
  today = Temporal.Now.plainDateISO()
): SpendingBucket[] => {
  const timeZoneId = Temporal.Now.timeZoneId();
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

  const start = today.subtract({ days: days - 1 });
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

export const sumSpendingByMerchant = (
  receipts: MerchantSpendingInput[]
): SpendingBucket[] => {
  const totals = new Map<string, number>();

  for (const receipt of receipts) {
    if (receipt.total === null || receipt.merchantName === null) {
      continue;
    }
    totals.set(
      receipt.merchantName,
      (totals.get(receipt.merchantName) ?? 0) + receipt.total
    );
  }

  return [...totals.entries()]
    .map(([label, total]) => ({ label, total: roundToCents(total) }))
    .toSorted((a, b) => b.total - a.total);
};
