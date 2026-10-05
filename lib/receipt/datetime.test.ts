import { describe, expect, it } from "vitest";

import {
  receiptDayToLocalString,
  receiptLocalStringToDay,
  receiptLocalStringToTime,
} from "@/lib/receipt/datetime";
import { simulateBrowserWithPolyfilledTemporal } from "@/test/polyfilled-temporal";

/**
 * The manual edit form stores the transaction datetime as a bare local
 * wall-clock string (`YYYY-MM-DDTHH:mm`), while the calendar works in whole
 * calendar days. These conversions are the seam between the two, so they are
 * pinned here rather than in the component.
 *
 * The calendar day is a `Date` at the browser's local midnight holding the
 * receipt-local year/month/day, never the instant that day begins: reading the
 * day back off the instant would shift it by a day for any browser west of
 * Australia/Brisbane.
 */

describe(receiptLocalStringToDay, () => {
  simulateBrowserWithPolyfilledTemporal();

  it("reads a local datetime string as a calendar day", () => {
    const day = receiptLocalStringToDay("2026-06-15T14:32");

    expect(day).toBeInstanceOf(Date);
    expect([day?.getFullYear(), day?.getMonth(), day?.getDate()]).toStrictEqual(
      [2026, 5, 15]
    );
    expect(day?.getHours()).toBe(0);
  });

  it("ignores the time of day when reading the day", () => {
    const early = receiptLocalStringToDay("2026-06-15T00:01");
    const late = receiptLocalStringToDay("2026-06-15T23:59");

    expect(early?.getDate()).toBe(late?.getDate());
  });

  it("accepts a date-only string and a datetime with seconds", () => {
    expect(receiptLocalStringToDay("2026-06-15")).toStrictEqual(
      receiptLocalStringToDay("2026-06-15T00:00")
    );
    expect(receiptLocalStringToDay("2026-06-15T14:32:00")).toStrictEqual(
      receiptLocalStringToDay("2026-06-15T14:32")
    );
  });

  it("has no day for a missing or unparseable value", () => {
    // `""` stands in for the missing-value path: a receipt with no extracted
    // datetime carries no value, which the form renders the same way.
    expect(receiptLocalStringToDay("")).toBeUndefined();
    expect(receiptLocalStringToDay("2026")).toBeUndefined();
    expect(receiptLocalStringToDay("28/07/2026 6:51pm")).toBeUndefined();
  });

  it("rejects a date that does not exist rather than rolling it over", () => {
    expect(receiptLocalStringToDay("2026-13-45")).toBeUndefined();
    expect(receiptLocalStringToDay("2026-02-30")).toBeUndefined();
  });
});

describe(receiptLocalStringToTime, () => {
  it("reads the time of day as HH:mm", () => {
    expect(receiptLocalStringToTime("2026-06-15T14:32")).toBe("14:32");
  });

  it("keeps the time when the value carries seconds", () => {
    expect(receiptLocalStringToTime("2026-06-15T14:32:00")).toBe("14:32");
  });

  it("has no time for a missing, date-only or unparseable value", () => {
    expect(receiptLocalStringToTime("")).toBeUndefined();
    expect(receiptLocalStringToTime("2026-06-15")).toBeUndefined();
    expect(receiptLocalStringToTime("28/07/2026 6:51pm")).toBeUndefined();
  });
});

describe(receiptDayToLocalString, () => {
  it("combines a calendar day with a time of day", () => {
    expect(receiptDayToLocalString(new Date(2026, 6, 20), "09:05")).toBe(
      "2026-07-20T09:05"
    );
  });

  it("falls back to midnight when no time is given", () => {
    expect(receiptDayToLocalString(new Date(2026, 6, 20))).toBe(
      "2026-07-20T00:00"
    );
  });

  it("pads single-digit months and days", () => {
    expect(receiptDayToLocalString(new Date(2026, 0, 5), "09:05")).toBe(
      "2026-01-05T09:05"
    );
  });

  it("falls back to midnight for a time that is not HH:mm", () => {
    expect(receiptDayToLocalString(new Date(2026, 6, 20), "9:05")).toBe(
      "2026-07-20T00:00"
    );
    expect(receiptDayToLocalString(new Date(2026, 6, 20), "noon")).toBe(
      "2026-07-20T00:00"
    );
  });

  it("round-trips a local datetime string through the calendar day", () => {
    const original = "2026-06-15T14:32";
    const day = receiptLocalStringToDay(original);

    if (!day) {
      throw new Error("expected a calendar day");
    }

    expect(
      receiptDayToLocalString(day, receiptLocalStringToTime(original))
    ).toBe(original);
  });
});
