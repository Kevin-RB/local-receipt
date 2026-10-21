import { describe, expect, it } from "vitest";

import {
  RECEIPT_TIMEZONE,
  receiptDayToLocalString,
  receiptLocalStringToDay,
  receiptLocalStringToTime,
  receiptToday,
} from "@/lib/receipt/datetime";
import { simulateBrowserWithPolyfilledTemporal } from "@/test/polyfilled-temporal";

const dayKey = (day: Date) =>
  `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;

/** The calendar-local date at an instant, read independently of the app's own helpers. */
const isoDayIn = (instant: number, timezone: string) =>
  new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric",
  }).format(new Date(instant));

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

  it("rejects an out-of-range time rather than passing it through", () => {
    expect(receiptLocalStringToTime("2026-06-15T99:99")).toBeUndefined();
    expect(
      receiptLocalStringToTime("2026-06-15T14:32 trailing")
    ).toBeUndefined();
  });
});

describe(receiptToday, () => {
  it("is today in the receipt timezone, carried as a local midnight", () => {
    const today = receiptToday();
    const expected = Temporal.Now.plainDateISO(RECEIPT_TIMEZONE);

    expect([
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    ]).toStrictEqual([expected.year, expected.month - 1, expected.day]);
    expect(today.getHours()).toBe(0);
  });

  it("resolves the day in the given timezone, not the browser's", () => {
    // The bug this pins: the calendar compares its cells (receipt-local days)
    // against this bound, so deriving the bound from a browser-local `new Date()`
    // made receipt-today read as tomorrow for any browser west of Brisbane during
    // the first hours of the receipt-local day, disabling the very day a receipt
    // was bought.
    //
    // Asserted by passing a timezone on either side of the date line: a browser
    // in Sydney is a day behind Brisbane, so reading "today" from the browser's
    // own clock cannot produce both answers.
    const sydney = "Australia/Sydney";
    const instant = Temporal.Now.instant().epochMilliseconds;

    const brisbaneDay = receiptToday(RECEIPT_TIMEZONE);
    const sydneyDay = receiptToday(sydney);

    expect(dayKey(brisbaneDay)).toBe(isoDayIn(instant, RECEIPT_TIMEZONE));
    expect(dayKey(sydneyDay)).toBe(isoDayIn(instant, sydney));

    // Both carry the browser-local midnight of their own receipt-local day, which
    // is what keeps the calendar's comparison on a single frame of reference.
    expect(brisbaneDay.getHours()).toBe(0);
    expect(sydneyDay.getHours()).toBe(0);
  });

  it("bounds the calendar on the receipt-local day, at a fixed instant", () => {
    // The regression this pins, at an instant where the two disagree by a whole
    // day: 2026-01-01T14:00Z is already 2026-01-02 in Brisbane (UTC+10) and still
    // 2026-01-01 in Tokyo (UTC+9). A browser-clock bound answers 2026-01-01 here,
    // putting the calendar a day behind the cells it draws, so a receipt bought on
    // the 2nd cannot be selected on the 2nd.
    //
    // The instant is passed in rather than read from the clock, so this cannot
    // pass by the suite happening to run inside Brisbane's local day. Faking the
    // clock is not an option: `Temporal.Now` comes from the polyfill, which reads
    // its own clock rather than the one `vi.setSystemTime` replaces.
    //
    // Tokyo rather than Sydney, deliberately: Sydney observes daylight saving and
    // is UTC+11 in January, so it sits a day ahead like Brisbane and produces no
    // divergence.
    const now = Temporal.Instant.from("2026-01-01T14:00:00Z");
    const behind = "Asia/Tokyo";

    expect(dayKey(receiptToday(RECEIPT_TIMEZONE, now))).toBe("2026-01-02");
    expect(dayKey(receiptToday(behind, now))).toBe("2026-01-01");

    // Both carry the browser-local midnight of their own receipt-local day, which
    // is what keeps the calendar's comparison on one frame of reference.
    expect(receiptToday(RECEIPT_TIMEZONE, now).getHours()).toBe(0);
    expect(receiptToday(behind, now).getHours()).toBe(0);
  });

  it("agrees with the calendar cell for a receipt bought that day", () => {
    // The bound and the cells the calendar draws must land on the same day, or
    // the day a receipt was bought is unreachable. At the fixed instant above,
    // Brisbane is on the 2nd, so a cell for a 09:00 purchase must be the 2nd.
    const cell = receiptLocalStringToDay("2026-01-02T09:00");

    expect(cell).toBeDefined();
    expect(dayKey(cell as Date)).toBe(
      dayKey(
        receiptToday(
          RECEIPT_TIMEZONE,
          Temporal.Instant.from("2026-01-01T14:00:00Z")
        )
      )
    );
  });

  it("accepts a Date as well as an Instant for the current moment", () => {
    const instant = Temporal.Instant.from("2026-01-01T14:00:00Z");

    expect(
      receiptToday(RECEIPT_TIMEZONE, new Date(instant.epochMilliseconds))
    ).toStrictEqual(receiptToday(RECEIPT_TIMEZONE, instant));
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
