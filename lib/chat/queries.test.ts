import { describe, expect, it } from "vitest";

import { startOfNextReceiptDay, startOfReceiptDay } from "./queries";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("receipt day bounds", () => {
  it("returns local midnight and the next local midnight", () => {
    const start = startOfReceiptDay("2026-08-25");
    const end = startOfNextReceiptDay("2026-08-25");

    // Australia/Brisbane is UTC+10 year-round (no daylight saving).
    expect(start.toISOString()).toBe("2026-08-24T14:00:00.000Z");
    expect(end.getTime() - start.getTime()).toBe(DAY_MS);
  });

  it("spans across a month boundary", () => {
    const start = startOfReceiptDay("2026-08-31");
    const end = startOfNextReceiptDay("2026-08-31");

    expect(end.toISOString()).toBe("2026-08-31T14:00:00.000Z");
    expect(end.getTime() - start.getTime()).toBe(DAY_MS);
  });
});
