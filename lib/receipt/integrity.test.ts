import { describe, expect, it } from "vitest";

import { reconcile } from "@/lib/receipt/integrity";
import type { ReconcileItem } from "@/lib/receipt/integrity";

const product = (lineTotal: number): ReconcileItem => ({
  kind: "product",
  lineTotal,
});

describe(reconcile, () => {
  it("sums product lines and matches a printed total", () => {
    expect(
      reconcile([product(10), product(5.5)], { total: 15.5 })
    ).toStrictEqual({
      delta: 0,
      itemsSum: 15.5,
      matches: true,
      productsSum: 15.5,
      surchargesSum: 0,
    });
  });

  it("counts a card surcharge as a surcharge, not a product", () => {
    const result = reconcile(
      [product(10), { kind: "surcharge", lineTotal: 0.37 }],
      { total: 10.37 }
    );

    expect(result.productsSum).toBe(10);
    expect(result.surchargesSum).toBe(0.37);
    expect(result.itemsSum).toBe(10.37);
    expect(result.delta).toBe(0);
    expect(result.matches).toBeTruthy();
  });

  it("reduces the product sum with a negative discount line", () => {
    const result = reconcile(
      [product(10), { kind: "discount", lineTotal: -2 }],
      { total: 8 }
    );

    expect(result.productsSum).toBe(8);
    expect(result.surchargesSum).toBe(0);
    expect(result.itemsSum).toBe(8);
    expect(result.matches).toBeTruthy();
  });

  it("reports a positive signed delta when the total exceeds the items", () => {
    const result = reconcile([product(15)], { total: 20 });

    expect(result.delta).toBe(5);
    expect(result.matches).toBeFalsy();
  });

  it("reports a negative signed delta when the items exceed the total", () => {
    const result = reconcile([product(15)], { total: 10 });

    expect(result.delta).toBe(-5);
    expect(result.matches).toBeFalsy();
  });

  it("matches empty items against a zero total", () => {
    expect(reconcile([], { total: 0 }).matches).toBeTruthy();
  });

  it("does not match empty items against a non-zero total", () => {
    expect(reconcile([], { total: 10 }).matches).toBeFalsy();
  });

  it("matches when there are no totals to reconcile", () => {
    expect(reconcile([product(10)], null).matches).toBeTruthy();
    expect(reconcile([product(10)]).matches).toBeTruthy();
    expect(reconcile([product(10)], { total: undefined }).matches).toBeTruthy();
  });

  it("does not match when the total is not a number", () => {
    expect(reconcile([product(10)], { total: Number.NaN }).matches).toBeFalsy();
  });

  it("does not match when a line total is not a number", () => {
    expect(reconcile([product(Number.NaN)], { total: 10 }).matches).toBeFalsy();
  });

  it("ignores sub-cent rounding differences", () => {
    expect(reconcile([product(9.995)], { total: 10 }).matches).toBeTruthy();
    expect(
      reconcile([product(0.1), product(0.2)], { total: 0.3 }).matches
    ).toBeTruthy();
  });

  it("treats a one-cent difference as a mismatch", () => {
    expect(reconcile([product(2.59)], { total: 2.6 }).matches).toBeFalsy();
  });

  it("ignores subtotal and gst when deciding a match", () => {
    const result = reconcile([product(10)], {
      gst: 0.91,
      subtotal: 9.09,
      total: 10,
    });

    expect(result.matches).toBeTruthy();
  });
});
