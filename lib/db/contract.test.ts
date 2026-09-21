import { describe, expect, it } from "vitest";

import { ReceiptInformationExtractionSchema } from "@/lib/db/contract";
import { receiptItemInsertSchema } from "@/lib/db/schema/receipt-item";

const persistenceItemSchema = receiptItemInsertSchema
  .omit({ id: true, receiptId: true })
  .array();

const base = {
  merchant: { name: "Store" },
  payment: { method: "card" as const },
  totals: { total: 10 },
  transaction: {},
};

describe("receipt information extraction contract", () => {
  it("keeps a surcharge line", () => {
    const result = ReceiptInformationExtractionSchema.parse({
      ...base,
      items: [{ kind: "surcharge", lineTotal: 0.37, name: "CREDIT SURCHARGE" }],
    });

    expect(result.items[0].kind).toBe("surcharge");
    expect(result.items[0].lineTotal).toBe(0.37);
  });

  it("keeps a negative discount line", () => {
    const result = ReceiptInformationExtractionSchema.parse({
      ...base,
      items: [{ kind: "discount", lineTotal: -2, name: "SPECIAL" }],
    });

    expect(result.items[0].kind).toBe("discount");
    expect(result.items[0].lineTotal).toBe(-2);
  });

  it("defaults a missing kind to product", () => {
    const result = ReceiptInformationExtractionSchema.parse({
      ...base,
      items: [{ lineTotal: 10, name: "Milk" }],
    });

    expect(result.items[0].kind).toBe("product");
  });

  it("defaults a missing quantity to one", () => {
    const result = ReceiptInformationExtractionSchema.parse({
      ...base,
      items: [{ lineTotal: 10, name: "Milk" }],
    });

    expect(result.items[0].quantity).toBe(1);
  });

  it("leaves unit price absent when the receipt does not print it", () => {
    const result = ReceiptInformationExtractionSchema.parse({
      ...base,
      items: [{ lineTotal: 10, name: "Milk" }],
    });

    expect("unitPrice" in result.items[0]).toBeFalsy();
    expect(result.items[0].unitPrice).toBeUndefined();
  });

  it("keeps a printed unit price", () => {
    const result = ReceiptInformationExtractionSchema.parse({
      ...base,
      items: [{ lineTotal: 10, name: "Milk", quantity: 2, unitPrice: 5 }],
    });

    expect(result.items[0].unitPrice).toBe(5);
  });

  it("omits subtotal and gst that the receipt does not print", () => {
    const result = ReceiptInformationExtractionSchema.parse({
      ...base,
      items: [{ lineTotal: 10, name: "Milk" }],
    });

    expect("subtotal" in result.totals).toBeFalsy();
    expect("gst" in result.totals).toBeFalsy();
  });

  it("keeps a printed, GST-inclusive subtotal and gst", () => {
    const result = ReceiptInformationExtractionSchema.parse({
      ...base,
      items: [{ lineTotal: 10, name: "Milk" }],
      totals: { gst: 0.91, subtotal: 10, total: 10 },
    });

    expect(result.totals.subtotal).toBe(10);
    expect(result.totals.gst).toBe(0.91);
  });

  it("produces items that satisfy the persistence insert schema", () => {
    const result = ReceiptInformationExtractionSchema.parse({
      ...base,
      items: [
        { kind: "discount", lineTotal: -2, name: "SPECIAL" },
        { kind: "surcharge", lineTotal: 0.37, name: "CREDIT SURCHARGE" },
        { lineTotal: 10, name: "Milk" },
      ],
    });

    expect(persistenceItemSchema.safeParse(result.items).success).toBeTruthy();
  });
});
