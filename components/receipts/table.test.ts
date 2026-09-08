import { describe, expect, it } from "vitest";

import { getStartOfPreviousMonth, getToday } from "@/components/receipts/table";
import { simulateBrowserWithPolyfilledTemporal } from "@/test/polyfilled-temporal";

describe("receipt table date helpers", () => {
  simulateBrowserWithPolyfilledTemporal();

  it("computes today without the Temporal global (older browsers)", () => {
    const today = getToday();

    expect(today).toBeInstanceOf(Date);
  });

  it("computes the start of the previous month without the Temporal global", () => {
    const start = getStartOfPreviousMonth();
    const expected = new Date();
    expected.setMonth(expected.getMonth() - 1);

    expect(start.getDate()).toBe(1);
    expect(start.getMonth()).toBe(expected.getMonth());
    expect(start.getFullYear()).toBe(expected.getFullYear());
  });
});
