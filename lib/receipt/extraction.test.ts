import { describe, expect, it } from "vitest";

import { normalizeExtractedItems } from "@/lib/receipt/extraction";

const product = (overrides: Record<string, unknown> = {}) => ({
  kind: "product" as const,
  lineTotal: 10,
  name: "Groceries",
  quantity: 1,
  ...overrides,
});

describe(normalizeExtractedItems, () => {
  it("leaves a positive product untouched", () => {
    expect(normalizeExtractedItems([product()])).toStrictEqual([product()]);
  });

  it("reads a negative line total as a discount", () => {
    const result = normalizeExtractedItems([product({ lineTotal: -2 })]);

    expect(result[0].kind).toBe("discount");
  });

  it("negates a discount the model reported as positive", () => {
    const result = normalizeExtractedItems([
      product({ kind: "discount", lineTotal: 2, name: "SPECIAL" }),
    ]);

    expect(result[0]).toStrictEqual(
      product({ kind: "discount", lineTotal: -2, name: "SPECIAL" })
    );
  });

  it("defaults a missing quantity to one", () => {
    const result = normalizeExtractedItems([
      product({ quantity: null as unknown as number }),
    ]);

    expect(result[0].quantity).toBe(1);
  });
});
