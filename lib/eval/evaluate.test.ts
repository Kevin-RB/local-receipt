import { describe, expect, it } from "vitest";

import type { ReceiptInformationExtraction } from "@/lib/db/contract";
import { normalizeExtractedItems } from "@/lib/receipt/extraction";

import { evaluateExtraction } from "./evaluate";
import type { FixtureGolden } from "./evaluate";

const golden: FixtureGolden = {
  evidence: {
    "merchant.name": "ALDI",
    "totals.total": "78.58",
  },
  extraction: {
    items: [
      { kind: "product", lineTotal: 78.21, name: "Groceries", quantity: 1 },
      {
        kind: "surcharge",
        lineTotal: 0.37,
        name: "CREDIT SURCHARGE",
        quantity: 1,
      },
    ],
    merchant: { name: "ALDI" },
    payment: { method: "card" },
    totals: { subtotal: 78.58, total: 78.58 },
    transaction: { datetime: "2026-07-28T18:51:00" },
  },
  id: "aldi-hash",
  image: "receipts/aldi.jpg",
};

const transcript =
  "ALDI STORES\nGROCERIES 78.21\nCREDIT SURCHARGE 0.37\nTOTAL 78.58";

const evaluate = (
  extraction: ReceiptInformationExtraction,
  text = transcript
) => evaluateExtraction({ extraction, golden, transcript: text });

describe(evaluateExtraction, () => {
  it("reports every field as matching when the extraction is identical", () => {
    const { fields, summary } = evaluate(golden.extraction);

    expect(summary.mismatched).toBe(0);
    expect(summary.ocr).toBe(0);
    expect(summary.parse).toBe(0);
    expect(fields.every((field) => field.status === "match")).toBeTruthy();
  });

  it("classifies a mismatch as a parse error when the transcript contains the value", () => {
    const { fields, summary } = evaluate({
      ...golden.extraction,
      totals: { subtotal: 78.58, total: 78.85 },
    });

    const total = fields.find((field) => field.path === "totals.total");

    expect(total).toMatchObject({
      actual: 78.85,
      errorClass: "parse",
      expected: 78.58,
      status: "mismatch",
    });
    expect(summary.parse).toBe(1);
    expect(summary.ocr).toBe(0);
  });

  it("classifies a mismatch as an OCR error when the transcript lacks the value", () => {
    const { fields, summary } = evaluate(
      {
        ...golden.extraction,
        totals: { subtotal: 78.58, total: 78.85 },
      },
      "ALDI STORES\nGROCERIES\nTOTAL 78.85"
    );

    const total = fields.find((field) => field.path === "totals.total");

    expect(total?.errorClass).toBe("ocr");
    expect(summary.ocr).toBe(1);
    expect(summary.parse).toBe(0);
  });

  it("treats an optional field absent from both the golden and the model as fine", () => {
    const noSubtotal: FixtureGolden = {
      ...golden,
      extraction: {
        ...golden.extraction,
        totals: { total: 78.58 },
      },
    };

    const { fields, summary } = evaluateExtraction({
      extraction: noSubtotal.extraction,
      golden: noSubtotal,
      transcript,
    });

    expect(
      fields.some((field) => field.path === "totals.subtotal")
    ).toBeFalsy();
    expect(summary.mismatched).toBe(0);
  });

  it("flags a field the golden omits but the model invents as a parse error", () => {
    const noSubtotal: FixtureGolden = {
      ...golden,
      extraction: {
        ...golden.extraction,
        totals: { total: 78.58 },
      },
    };

    const { fields } = evaluateExtraction({
      extraction: golden.extraction,
      golden: noSubtotal,
      transcript,
    });

    const subtotal = fields.find((field) => field.path === "totals.subtotal");

    expect(subtotal).toMatchObject({
      actual: 78.58,
      errorClass: "parse",
      expected: undefined,
      status: "mismatch",
    });
  });

  it("reports extra line items the golden does not have", () => {
    const { fields } = evaluate({
      ...golden.extraction,
      items: [
        ...golden.extraction.items,
        { kind: "product", lineTotal: 1.5, name: "BAG", quantity: 1 },
      ],
    });

    const extra = fields.find((field) => field.path === "items[2].name");

    expect(extra).toMatchObject({
      actual: "BAG",
      errorClass: "parse",
      expected: undefined,
      status: "mismatch",
    });
  });

  it("respects the money model: a missing quantity defaults to one, unit price stays absent", () => {
    const rawItems = [
      { kind: "product", lineTotal: 78.58, name: "Groceries" },
    ] as unknown as ReceiptInformationExtraction["items"];

    const oneItemGolden: FixtureGolden = {
      ...golden,
      extraction: {
        items: [
          { kind: "product", lineTotal: 78.58, name: "Groceries", quantity: 1 },
        ],
        merchant: { name: "ALDI" },
        payment: { method: "card" },
        totals: { total: 78.58 },
        transaction: {},
      },
    };

    const { summary } = evaluateExtraction({
      extraction: {
        ...oneItemGolden.extraction,
        items: normalizeExtractedItems(rawItems),
      },
      golden: oneItemGolden,
      transcript,
    });

    expect(summary.mismatched).toBe(0);
  });
});
