import { describe, expect, it } from "vitest";

import { formatAmount, formatDay } from "./format";

describe("currency formatting", () => {
  it("formats an amount as Australian dollars", () => {
    expect(formatAmount(1234.5)).toBe("$1,234.50");
  });

  it("renders an em dash for missing or non-finite amounts", () => {
    expect(formatAmount(null)).toBe("—");
    expect(formatAmount(Number.NaN)).toBe("—");
  });
});

describe("day formatting", () => {
  it("formats a receipt-local ISO date without shifting the day", () => {
    expect(formatDay("2026-08-25")).toBe("25 Aug");
    expect(formatDay("2026-01-01")).toBe("1 Jan");
  });

  it("renders an em dash for missing or malformed dates", () => {
    expect(formatDay(null)).toBe("—");
    expect(formatDay("")).toBe("—");
    expect(formatDay("not-a-date")).toBe("—");
  });
});
