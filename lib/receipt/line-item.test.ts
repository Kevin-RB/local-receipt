import { describe, expect, it } from "vitest";

import type { LineItemKind } from "@/lib/db/schema/receipt-item";
import { normalizeLineItems } from "@/lib/receipt/line-item";

const item = (
  overrides: Partial<{
    kind: LineItemKind;
    lineTotal: number;
    name: string;
    unitPrice: number | null;
  }> = {}
) => ({
  kind: "product" as const,
  lineTotal: 10,
  name: "Milk",
  unitPrice: null as number | null,
  ...overrides,
});

describe(normalizeLineItems, () => {
  it("leaves a product's amount alone, sign included", () => {
    const result = normalizeLineItems([item({ lineTotal: -2 })]);

    expect(result[0].kind).toBe("product");
    expect(result[0].lineTotal).toBe(-2);
  });

  it("leaves an unparseable discount amount unparseable, not a second flavour of NaN", () => {
    const result = normalizeLineItems([
      item({ kind: "discount", lineTotal: Number.NaN, unitPrice: Number.NaN }),
    ]);

    expect(result[0].lineTotal).toBeNaN();
    expect(result[0].unitPrice).toBeNaN();
  });

  it("leaves a positive product untouched", () => {
    const result = normalizeLineItems([item()]);

    expect(result).toStrictEqual([item()]);
  });

  it("leaves a positive surcharge untouched", () => {
    const result = normalizeLineItems([
      item({ kind: "surcharge", lineTotal: 0.37 }),
    ]);

    expect(result[0]).toStrictEqual(
      item({ kind: "surcharge", lineTotal: 0.37 })
    );
  });

  it("negates a discount the caller reported as positive", () => {
    const result = normalizeLineItems([
      item({ kind: "discount", lineTotal: 2 }),
    ]);

    expect(result[0]).toStrictEqual(item({ kind: "discount", lineTotal: -2 }));
  });

  it("leaves an already negative discount negative", () => {
    const result = normalizeLineItems([
      item({ kind: "discount", lineTotal: -2 }),
    ]);

    expect(result[0].lineTotal).toBe(-2);
  });

  it("is idempotent", () => {
    const once = normalizeLineItems([item({ kind: "discount", lineTotal: 2 })]);

    expect(normalizeLineItems(once)).toStrictEqual(once);
  });

  it("keeps a zero discount at zero rather than negative zero", () => {
    const result = normalizeLineItems([
      item({ kind: "discount", lineTotal: 0 }),
    ]);

    expect(result[0].lineTotal).toBe(0);
    expect(Object.is(result[0].lineTotal, -0)).toBeFalsy();
  });

  it("negates a discount's unit price so quantity times price still reconciles", () => {
    const result = normalizeLineItems([
      item({ kind: "discount", lineTotal: 2, unitPrice: 1 }),
    ]);

    expect(result[0].unitPrice).toBe(-1);
  });

  it("leaves an absent unit price absent", () => {
    const result = normalizeLineItems([
      item({ kind: "discount", lineTotal: 2, unitPrice: null }),
    ]);

    expect(result[0].unitPrice).toBeNull();
  });

  it("does not add a unit price key to an item that states none", () => {
    const result = normalizeLineItems([
      { kind: "discount" as const, lineTotal: 2, name: "SPECIAL" },
    ]);

    expect("unitPrice" in result[0]).toBeFalsy();
  });

  it("preserves fields beyond the money ones", () => {
    const result = normalizeLineItems([
      item({ kind: "discount", lineTotal: 2, name: "SPECIAL" }),
    ]);

    expect(result[0].name).toBe("SPECIAL");
  });

  it("returns an empty list unchanged", () => {
    expect(normalizeLineItems([])).toStrictEqual([]);
  });
});
