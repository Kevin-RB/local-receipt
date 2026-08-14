import { InngestTestEngine } from "@inngest/test";
import { describe, it, expect, vi } from "vitest";

import type { ReceiptInformationExtraction } from "@/lib/db/contract";

import { transcribeReceipt } from "./transcribe-receipt";

interface FunctionOutput {
  extraction: ReceiptInformationExtraction;
  integrityWarning: boolean;
  receiptId: string;
}

const mockExtraction: ReceiptInformationExtraction = {
  items: [
    { lineTotal: 4.5, name: "REG LATTE" },
    { lineTotal: 12.9, name: "SRIRACHA CHICKEN" },
  ],
  merchant: { name: "Test Cafe" },
  payment: { method: "card" },
  totals: { total: 17.4 },
  transaction: { datetime: "2025-01-15T10:30:00Z", receiptNumber: "ABC123" },
};

const mockPublish = vi.fn<() => Promise<void>>();

const baseSteps = [
  {
    handler: () => ({
      id: "00000000-0000-0000-0000-000000000001",
      minioObjectKey: "receipts/test.jpg",
      status: "pending" as const,
    }),
    id: "lookup-receipt",
  },
  {
    handler: () => null,
    id: "mark-processing",
  },
  {
    handler: () => "FAKE OCR TRANSCRIPT",
    id: "extracting",
  },
  {
    handler: () => mockExtraction,
    id: "parsing",
  },
  {
    handler: () => null,
    id: "storing",
  },
];

const createEngine = (overrides?: Partial<(typeof baseSteps)[number]>) =>
  new InngestTestEngine({
    events: [
      {
        data: {
          receiptId: "00000000-0000-0000-0000-000000000001",
        },
        name: "receipt/uploaded",
      },
    ],
    function: transcribeReceipt,
    steps: overrides
      ? baseSteps.map((s) =>
          s.id === overrides.id ? { ...s, ...overrides } : s
        )
      : baseSteps,
    transformCtx: (rawCtx) => {
      if (rawCtx.step && typeof rawCtx.step === "object") {
        const stepProxy = new Proxy(rawCtx.step, {
          get(target, prop) {
            if (prop === "realtime") {
              return { publish: mockPublish };
            }
            return Reflect.get(target, prop, target);
          },
        });
        return { ...rawCtx, step: stepProxy as typeof rawCtx.step };
      }
      return rawCtx;
    },
  });

describe("transcribeReceipt function", () => {
  it("runs extracting → parsing → storing and returns the extraction", async () => {
    const engine = createEngine();
    const { result } = await engine.execute();
    const output = result as FunctionOutput;

    expect(output).toBeDefined();
    expect(output.receiptId).toBe("00000000-0000-0000-0000-000000000001");
    expect(output.extraction).toStrictEqual(mockExtraction);
    expect(output.integrityWarning).toBeFalsy();
  });

  it("sets integrityWarning when line-sum mismatches total", async () => {
    const badExtraction: ReceiptInformationExtraction = {
      items: [{ lineTotal: 10, name: "Item 1" }],
      merchant: { name: "Store" },
      payment: {},
      totals: { total: 15 },
      transaction: {},
    };

    const engine = createEngine({
      handler: () => badExtraction,
      id: "parsing",
    });
    const { result } = await engine.execute();
    const output = result as FunctionOutput;

    expect(output.integrityWarning).toBeTruthy();
  });

  it("sets integrityWarning false when line sum matches total exactly", async () => {
    const exactExtraction: ReceiptInformationExtraction = {
      items: [
        { lineTotal: 5, name: "A" },
        { lineTotal: 5, name: "B" },
        { lineTotal: 0.01, name: "C" },
      ],
      merchant: { name: "Store" },
      payment: {},
      totals: { total: 10.01 },
      transaction: {},
    };

    const engine = createEngine({
      handler: () => exactExtraction,
      id: "parsing",
    });
    const { result } = await engine.execute();
    const output = result as FunctionOutput;

    expect(output.integrityWarning).toBeFalsy();
  });

  it("completes without integrity warning when subtotal and gst are present", async () => {
    const fullExtraction: ReceiptInformationExtraction = {
      items: [{ lineTotal: 10, name: "Product" }],
      merchant: { abn: "12345678901", name: "Full Store" },
      payment: { method: "card" },
      totals: { gst: 0.91, subtotal: 9.09, total: 10 },
      transaction: {
        datetime: "2025-06-01T12:00:00Z",
        receiptNumber: "RCPT-001",
      },
    };

    const engine = createEngine({
      handler: () => fullExtraction,
      id: "parsing",
    });
    const { result } = await engine.execute();
    const output = result as FunctionOutput;

    expect(output.integrityWarning).toBeFalsy();
    expect(output.extraction.totals.subtotal).toBe(9.09);
    expect(output.extraction.totals.gst).toBe(0.91);
  });

  it("runs the full function successfully", async () => {
    const engine = createEngine();
    const { result, error } = await engine.execute();
    const output = result as FunctionOutput;

    expect(error).toBeUndefined();
    expect(output.receiptId).toBeDefined();
    expect(output.extraction.items).toHaveLength(2);
    expect(output.extraction.merchant.name).toBe("Test Cafe");
  });
});
