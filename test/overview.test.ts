import { describe, expect, it } from "vitest";

import { sumSpending } from "@/lib/overview";
import type { SpendingInput, SpendingPeriod } from "@/lib/overview";

const TODAY = Temporal.PlainDate.from("2026-08-19");
const DAYS = { count: 30, granularity: "day" } satisfies SpendingPeriod;
const TWO_MONTHS = { count: 2, granularity: "month" } satisfies SpendingPeriod;
const THREE_MONTHS = {
  count: 3,
  granularity: "month",
} satisfies SpendingPeriod;

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

const monthKey = (date: Date): string =>
  date
    .toTemporalInstant()
    .toZonedDateTimeISO(Temporal.Now.timeZoneId())
    .toPlainDate()
    .toPlainYearMonth()
    .toString();

const totalFor = (
  result: ReturnType<typeof sumSpending>,
  label: string
): number => result.find((entry) => entry.label === label)?.total ?? -1;

describe(sumSpending, () => {
  it("returns one bucket per day covering the last 30 days", () => {
    const result = sumSpending([], DAYS, TODAY);

    expect(result).toHaveLength(30);
    expect(result[0]?.label).toBe(TODAY.subtract({ days: 29 }).toString());
    expect(result[29]?.label).toBe(TODAY.toString());
  });

  it("returns one bucket per month covering the period", () => {
    expect(
      sumSpending([], TWO_MONTHS, TODAY).map((b) => b.label)
    ).toStrictEqual(["2026-07", "2026-08"]);
    expect(
      sumSpending([], THREE_MONTHS, TODAY).map((b) => b.label)
    ).toStrictEqual(["2026-06", "2026-07", "2026-08"]);
  });

  it("sums totals of receipts into their transaction day", () => {
    const result = sumSpending(
      [
        receipt({ total: 12.34, transactionDateTime: new Date(2026, 7, 3) }),
        receipt({ total: 20, transactionDateTime: new Date(2026, 7, 3) }),
        receipt({ total: 5, transactionDateTime: new Date(2026, 7, 1) }),
      ],
      DAYS,
      TODAY
    );

    expect(totalFor(result, dayKey(new Date(2026, 7, 3)))).toBe(32.34);
    expect(totalFor(result, dayKey(new Date(2026, 7, 1)))).toBe(5);
  });

  it("sums totals of receipts into their transaction month", () => {
    const result = sumSpending(
      [
        receipt({ total: 12.34, transactionDateTime: new Date(2026, 7, 3) }),
        receipt({ total: 20, transactionDateTime: new Date(2026, 7, 3) }),
        receipt({ total: 5, transactionDateTime: new Date(2026, 6, 15) }),
        receipt({ total: 1, transactionDateTime: new Date(2026, 5, 30) }),
      ],
      THREE_MONTHS,
      TODAY
    );

    expect(totalFor(result, "2026-06")).toBe(1);
    expect(totalFor(result, "2026-07")).toBe(5);
    expect(totalFor(result, "2026-08")).toBe(32.34);
  });

  it("skips receipts without a total or transaction datetime", () => {
    const result = sumSpending(
      [receipt({ total: null }), receipt({ transactionDateTime: null })],
      DAYS,
      TODAY
    );

    expect(result.every((entry) => entry.total === 0)).toBeTruthy();
  });

  it("ignores receipts outside the day window", () => {
    const result = sumSpending(
      [
        receipt({ transactionDateTime: new Date(2026, 6, 20) }),
        receipt({ transactionDateTime: new Date(2026, 8, 1) }),
      ],
      DAYS,
      TODAY
    );

    expect(result.every((entry) => entry.total === 0)).toBeTruthy();
  });

  it("ignores receipts outside the month window", () => {
    const result = sumSpending(
      [receipt({ transactionDateTime: new Date(2026, 4, 1) })],
      THREE_MONTHS,
      TODAY
    );

    expect(totalFor(result, monthKey(new Date(2026, 4, 1)))).toBe(-1);
    expect(result.every((entry) => entry.total === 0)).toBeTruthy();
  });

  it("rounds totals to cents", () => {
    const result = sumSpending(
      [
        receipt({ total: 0.1, transactionDateTime: new Date(2026, 7, 1) }),
        receipt({ total: 0.2, transactionDateTime: new Date(2026, 7, 1) }),
      ],
      DAYS,
      TODAY
    );

    expect(totalFor(result, dayKey(new Date(2026, 7, 1)))).toBe(0.3);
  });
});
