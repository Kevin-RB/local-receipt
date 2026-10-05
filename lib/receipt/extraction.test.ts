import { describe, expect, it } from "vitest";

import type { LineItemKind } from "@/lib/db/schema/receipt-item";
import { normalizeExtractedItems } from "@/lib/receipt/extraction";

/** The shape the model returns: a parsed line, before the money model is applied. */
const line = (
  overrides: Partial<{
    kind: LineItemKind;
    lineTotal: number;
    name: string;
    quantity: number | null;
  }> = {}
) => ({
  kind: "product" as LineItemKind,
  lineTotal: 10,
  name: "Groceries",
  quantity: 1 as number | null,
  ...overrides,
});

describe(normalizeExtractedItems, () => {
  it("leaves a positive product untouched", () => {
    expect(normalizeExtractedItems([line()])).toStrictEqual([line()]);
  });

  it("reads a printed negative amount as a discount", () => {
    const result = normalizeExtractedItems([line({ lineTotal: -2 })]);

    expect(result[0].kind).toBe("discount");
    expect(result[0].lineTotal).toBe(-2);
  });

  it("stores a labelled discount as a deduction", () => {
    const result = normalizeExtractedItems([
      line({ kind: "discount", lineTotal: 2, name: "SPECIAL" }),
    ]);

    expect(result[0]).toStrictEqual(
      line({ kind: "discount", lineTotal: -2, name: "SPECIAL" })
    );
  });

  it("defaults a missing quantity to one", () => {
    const result = normalizeExtractedItems([line({ quantity: null })]);

    expect(result[0].quantity).toBe(1);
  });
});
