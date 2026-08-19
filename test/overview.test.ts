import { describe, expect, it } from "vitest";

import { sumDailySpending } from "@/lib/overview";
import type { SpendingInput } from "@/lib/overview";

const TODAY = Temporal.PlainDate.from("2026-08-19");

const receipt = (overrides: Partial<SpendingInput> = {}): SpendingInput => ({
  total: 10,
  transactionDateTime: new Date(2026, 7, 1),
  ...overrides,
});

const dayKey = (date: Date): string =>
  date
    .toTemporalInstant()
    .toZonedDateTimeISO(Temporal.Now.timeZoneId())
    .toPlainDate()
    .toString();

const totalFor = (
  result: ReturnType<typeof sumDailySpending>,
  label: string
): number => result.find((entry) => entry.label === label)?.total ?? -1;

describe(sumDailySpending, () => {
  it("returns one bucket per day covering the last 30 days", () => {
    const result = sumDailySpending([], TODAY);

    expect(result).toHaveLength(30);
    expect(result[0]?.label).toBe(TODAY.subtract({ days: 29 }).toString());
    expect(result[29]?.label).toBe(TODAY.toString());
  });

  it("labels buckets with the ISO date string", () => {
    const result = sumDailySpending([], TODAY);

    expect(result[29]?.label).toBe("2026-08-19");
  });

  it("sums totals of receipts into their transaction day", () => {
    const result = sumDailySpending(
      [
        receipt({ total: 12.34, transactionDateTime: new Date(2026, 7, 3) }),
        receipt({ total: 20, transactionDateTime: new Date(2026, 7, 3) }),
        receipt({ total: 5, transactionDateTime: new Date(2026, 7, 1) }),
      ],
      TODAY
    );

    expect(totalFor(result, dayKey(new Date(2026, 7, 3)))).toBe(32.34);
    expect(totalFor(result, dayKey(new Date(2026, 7, 1)))).toBe(5);
  });

  it("skips receipts without a total or transaction datetime", () => {
    const result = sumDailySpending(
      [receipt({ total: null }), receipt({ transactionDateTime: null })],
      TODAY
    );

    expect(result.every((entry) => entry.total === 0)).toBeTruthy();
  });

  it("ignores receipts outside the 30 day window", () => {
    const result = sumDailySpending(
      [
        receipt({ transactionDateTime: new Date(2026, 6, 20) }),
        receipt({ transactionDateTime: new Date(2026, 8, 1) }),
      ],
      TODAY
    );

    expect(result.every((entry) => entry.total === 0)).toBeTruthy();
  });

  it("rounds daily totals to cents", () => {
    const result = sumDailySpending(
      [
        receipt({ total: 0.1, transactionDateTime: new Date(2026, 7, 1) }),
        receipt({ total: 0.2, transactionDateTime: new Date(2026, 7, 1) }),
      ],
      TODAY
    );

    expect(totalFor(result, dayKey(new Date(2026, 7, 1)))).toBe(0.3);
  });
});
