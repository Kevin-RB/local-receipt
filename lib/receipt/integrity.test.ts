import { describe, expect, it } from "vitest";

import { computeIntegrityWarning } from "@/lib/receipt/integrity";

describe(computeIntegrityWarning, () => {
  it("returns false when items sum equals totals.total", () => {
    expect(
      computeIntegrityWarning([{ lineTotal: 10 }, { lineTotal: 5.5 }], {
        total: 15.5,
      })
    ).toBeFalsy();
  });

  it("returns true when items sum differs from totals.total", () => {
    expect(
      computeIntegrityWarning([{ lineTotal: 10 }, { lineTotal: 5 }], {
        total: 20,
      })
    ).toBeTruthy();
  });

  it("returns true when items sum is lower than totals.total", () => {
    expect(
      computeIntegrityWarning([{ lineTotal: 5 }], { total: 10 })
    ).toBeTruthy();
  });

  it("returns false for empty items with zero total", () => {
    expect(computeIntegrityWarning([], { total: 0 })).toBeFalsy();
  });

  it("returns true for empty items with non-zero total", () => {
    expect(computeIntegrityWarning([], { total: 10 })).toBeTruthy();
  });

  it("returns false when totals is null", () => {
    expect(computeIntegrityWarning([{ lineTotal: 10 }], null)).toBeFalsy();
  });

  it("returns false when totals is undefined", () => {
    const totals = undefined;
    expect(computeIntegrityWarning([{ lineTotal: 10 }], totals)).toBeFalsy();
  });

  it("handles floating-point sums that match within tolerance", () => {
    const totals = { total: 0.3 };
    expect(
      computeIntegrityWarning([{ lineTotal: 0.1 }, { lineTotal: 0.2 }], totals)
    ).toBeFalsy();
  });

  it("handles floating-point sums outside tolerance", () => {
    const totals = { total: 0.32 };
    expect(
      computeIntegrityWarning([{ lineTotal: 0.1 }, { lineTotal: 0.2 }], totals)
    ).toBeTruthy();
  });

  it("flags a diff exactly equal to one cent", () => {
    const totals = { total: 2.6 };
    expect(computeIntegrityWarning([{ lineTotal: 2.59 }], totals)).toBeTruthy();
  });

  it("ignores sub-cent rounding differences", () => {
    const totals = { total: 10 };
    expect(computeIntegrityWarning([{ lineTotal: 9.995 }], totals)).toBeFalsy();
  });

  it("returns false when totals.total is undefined", () => {
    const totals = { total: undefined };
    expect(computeIntegrityWarning([{ lineTotal: 10 }], totals)).toBeFalsy();
  });

  it("returns a warning when the total is not a number", () => {
    const totals = { total: Number.NaN };
    expect(computeIntegrityWarning([{ lineTotal: 10 }], totals)).toBeTruthy();
  });

  it("returns a warning when an item line total is not a number", () => {
    const totals = { total: 10 };
    expect(
      computeIntegrityWarning([{ lineTotal: Number.NaN }], totals)
    ).toBeTruthy();
  });

  it("returns true when items sum includes many small differences", () => {
    const totals = { total: 30 };
    expect(
      computeIntegrityWarning(
        [{ lineTotal: 9.99 }, { lineTotal: 4.99 }, { lineTotal: 14.99 }],
        totals
      )
    ).toBeTruthy();
  });
});
