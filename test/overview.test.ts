import { describe, expect, it } from "vitest";

import { sumDailySpending, windowDays } from "@/lib/overview";
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

describe(windowDays, () => {
  it("counts the inclusive window of trailing months", () => {
    expect(windowDays(TODAY, 2)).toBe(62);
    expect(windowDays(TODAY, 3)).toBe(93);
  });
});

describe(sumDailySpending, () => {
  it("returns one bucket per day covering the requested number of days", () => {
    const result = sumDailySpending([], 30, TODAY);

    expect(result).toHaveLength(30);
    expect(result[0]?.label).toBe(TODAY.subtract({ days: 29 }).toString());
    expect(result[29]?.label).toBe(TODAY.toString());
  });

  it("returns daily buckets across a month window", () => {
    const twoMonths = sumDailySpending([], windowDays(TODAY, 2), TODAY);

    expect(twoMonths).toHaveLength(62);
    expect(twoMonths[0]?.label).toBe("2026-06-19");
    expect(twoMonths[61]?.label).toBe(TODAY.toString());

    const threeMonths = sumDailySpending([], windowDays(TODAY, 3), TODAY);

    expect(threeMonths).toHaveLength(93);
    expect(threeMonths[0]?.label).toBe("2026-05-19");
  });

  it("sums totals of receipts into their transaction day", () => {
    const result = sumDailySpending(
      [
        receipt({ total: 12.34, transactionDateTime: new Date(2026, 7, 3) }),
        receipt({ total: 20, transactionDateTime: new Date(2026, 7, 3) }),
        receipt({ total: 5, transactionDateTime: new Date(2026, 7, 1) }),
      ],
      30,
      TODAY
    );

    expect(totalFor(result, dayKey(new Date(2026, 7, 3)))).toBe(32.34);
    expect(totalFor(result, dayKey(new Date(2026, 7, 1)))).toBe(5);
  });

  it("skips receipts without a total or transaction datetime", () => {
    const result = sumDailySpending(
      [receipt({ total: null }), receipt({ transactionDateTime: null })],
      30,
      TODAY
    );

    expect(result.every((entry) => entry.total === 0)).toBeTruthy();
  });

  it("ignores receipts outside the day window", () => {
    const result = sumDailySpending(
      [
        receipt({ transactionDateTime: new Date(2026, 6, 20) }),
        receipt({ transactionDateTime: new Date(2026, 8, 1) }),
      ],
      30,
      TODAY
    );

    expect(result.every((entry) => entry.total === 0)).toBeTruthy();
  });

  it("rounds totals to cents", () => {
    const result = sumDailySpending(
      [
        receipt({ total: 0.1, transactionDateTime: new Date(2026, 7, 1) }),
        receipt({ total: 0.2, transactionDateTime: new Date(2026, 7, 1) }),
      ],
      30,
      TODAY
    );

    expect(totalFor(result, dayKey(new Date(2026, 7, 1)))).toBe(0.3);
  });
});
