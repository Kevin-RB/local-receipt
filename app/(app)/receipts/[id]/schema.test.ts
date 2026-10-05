import { describe, expect, it } from "vitest";

import { updateReceiptSchema } from "./schema";

const base = {
  merchant: { name: "Coles" },
  payment: { method: "card" as const },
  receiptId: "123e4567-e89b-12d3-a456-426614174000",
  totals: { total: 8 },
  transaction: {},
};

const withItems = (items: unknown[]) =>
  updateReceiptSchema.safeParse({ ...base, items });

describe("update receipt schema", () => {
  it("accepts a discount's negative unit price", () => {
    const result = withItems([
      { kind: "discount", lineTotal: -2, name: "SPECIAL", unitPrice: -1 },
    ]);

    expect(result.success).toBeTruthy();
  });

  it("rejects a negative quantity, which is never a deduction", () => {
    const result = withItems([
      { kind: "product", lineTotal: 10, name: "Milk", quantity: -1 },
    ]);

    expect(result.success).toBeFalsy();
  });

  it("rejects a negative receipt total", () => {
    const result = updateReceiptSchema.safeParse({
      ...base,
      items: [],
      totals: { total: -1 },
    });

    expect(result.success).toBeFalsy();
  });

  it("accepts a negative line total", () => {
    const result = withItems([
      { kind: "discount", lineTotal: -2, name: "SPECIAL" },
    ]);

    expect(result.success).toBeTruthy();
  });
});
