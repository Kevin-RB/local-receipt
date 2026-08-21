import { describe, expect, it } from "vitest";

import { dateRangeFilterFn } from "@/components/receipts/filters";
import type { DateRangeFilterValue } from "@/components/receipts/filters";

const filter = (value: unknown, range: DateRangeFilterValue) =>
  dateRangeFilterFn({ getValue: () => value }, "transactionDateTime", range);

describe(dateRangeFilterFn, () => {
  it("keeps all rows when the range is empty", () => {
    expect(filter(new Date("2026-08-01T02:00:00Z"), {})).toBeTruthy();
  });

  it("matches on the Brisbane calendar day", () => {
    // 2026-07-31T14:30Z is 2026-08-01 00:30 Brisbane
    const row = new Date("2026-07-31T14:30:00Z");
    expect(filter(row, { from: new Date("2026-08-01") })).toBeTruthy();
    expect(filter(row, { from: new Date("2026-08-02") })).toBeFalsy();
  });

  it("respects an inclusive to boundary", () => {
    // 2026-08-05T06:00Z is 16:00 Brisbane on Aug 5
    const row = new Date("2026-08-05T06:00:00Z");
    expect(
      filter(row, { from: new Date("2026-08-01"), to: new Date("2026-08-05") })
    ).toBeTruthy();
    expect(
      filter(row, { from: new Date("2026-08-01"), to: new Date("2026-08-04") })
    ).toBeFalsy();
  });

  it("rejects non-date values", () => {
    expect(filter("not a date", { from: new Date("2026-01-01") })).toBeFalsy();
  });
});
