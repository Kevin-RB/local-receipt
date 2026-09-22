import { InngestTestEngine } from "@inngest/test";
import { beforeEach, describe, it, expect, vi } from "vitest";

import type { ReceiptInformationExtraction } from "@/lib/db/contract";

import { transcribeReceipt } from "./transcribe-receipt";

const { mockSet, mockUpdate } = vi.hoisted(() => {
  const setWhere = vi.fn<() => Promise<void>>().mockResolvedValue();
  const setValue = vi
    .fn<(payload: Record<string, unknown>) => { where: typeof setWhere }>()
    .mockReturnValue({ where: setWhere });
  const updateTable = vi
    .fn<(table: unknown) => { set: typeof setValue }>()
    .mockReturnValue({ set: setValue });

  return { mockSet: setValue, mockUpdate: updateTable };
});

// @ts-expect-error mock types don't match Drizzle internals
vi.mock(import("@/lib/db"), () => ({
  db: { update: mockUpdate },
  findReceiptById: vi.fn<() => Promise<null>>(),
  receiptItems: {},
  receipts: {},
}));

interface FunctionOutput {
  extraction: ReceiptInformationExtraction;
  integrityWarning: boolean;
  receiptId: string;
}

const mockExtraction: ReceiptInformationExtraction = {
  items: [
    { kind: "product", lineTotal: 4.5, name: "REG LATTE", quantity: 1 },
    { kind: "product", lineTotal: 12.9, name: "SRIRACHA CHICKEN", quantity: 1 },
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
      objectKey: "receipts/test.jpg",
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
    id: "store-transcript",
  },
  {
    handler: () => null,
    id: "storing",
  },
];

const applyOverrides = (overrides?: Partial<(typeof baseSteps)[number]>) =>
  overrides
    ? baseSteps.map((s) => (s.id === overrides.id ? { ...s, ...overrides } : s))
    : baseSteps;

const createEngine = (
  overrides?: Partial<(typeof baseSteps)[number]>,
  unmocked: string[] = []
) =>
  new InngestTestEngine({
    events: [
      {
        data: {
          receiptId: "00000000-0000-0000-0000-000000000001",
          userId: "user-1",
        },
        name: "receipt/uploaded",
      },
    ],
    function: transcribeReceipt,
    steps: applyOverrides(overrides).filter((s) => !unmocked.includes(s.id)),
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
  beforeEach(() => {
    mockSet.mockClear();
    mockUpdate.mockClear();
  });

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
      items: [{ kind: "product", lineTotal: 10, name: "Item 1", quantity: 1 }],
      merchant: { name: "Store" },
      payment: { method: "other" },
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
        { kind: "product", lineTotal: 5, name: "A", quantity: 1 },
        { kind: "product", lineTotal: 5, name: "B", quantity: 1 },
        { kind: "product", lineTotal: 0.01, name: "C", quantity: 1 },
      ],
      merchant: { name: "Store" },
      payment: { method: "other" },
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

  it("counts a card surcharge as a line that reconciles the total", async () => {
    const surchargeExtraction: ReceiptInformationExtraction = {
      items: [
        { kind: "product", lineTotal: 10, name: "Groceries", quantity: 1 },
        {
          kind: "surcharge",
          lineTotal: 0.37,
          name: "CREDIT SURCHARGE",
          quantity: 1,
        },
      ],
      merchant: { name: "ALDI" },
      payment: { method: "card" },
      totals: { subtotal: 10.37, total: 10.37 },
      transaction: {},
    };

    const engine = createEngine({
      handler: () => surchargeExtraction,
      id: "parsing",
    });
    const { result } = await engine.execute();
    const output = result as FunctionOutput;

    expect(output.integrityWarning).toBeFalsy();
    expect(output.extraction.items[1].kind).toBe("surcharge");
  });

  it("forces a negative line total to a discount regardless of model output", async () => {
    const discounted = {
      items: [
        { kind: "product", lineTotal: 10, name: "Groceries", quantity: 1 },
        { kind: "product", lineTotal: -2, name: "SPECIAL", quantity: 1 },
      ],
      merchant: { name: "Coles" },
      payment: { method: "card" },
      totals: { total: 8 },
      transaction: {},
    } as unknown as ReceiptInformationExtraction;

    const engine = createEngine({
      handler: () => discounted,
      id: "parsing",
    });
    const { result } = await engine.execute();
    const output = result as FunctionOutput;

    expect(output.extraction.items[1].kind).toBe("discount");
    expect(output.integrityWarning).toBeFalsy();
  });

  it("defaults a missing kind and quantity on an extracted line", async () => {
    const sparse = {
      items: [{ lineTotal: 10, name: "Product" }],
      merchant: { name: "Store" },
      payment: { method: "other" },
      totals: { total: 10 },
      transaction: {},
    } as unknown as ReceiptInformationExtraction;

    const engine = createEngine({ handler: () => sparse, id: "parsing" });
    const { result } = await engine.execute();
    const output = result as FunctionOutput;

    expect(output.extraction.items[0].kind).toBe("product");
    expect(output.extraction.items[0].quantity).toBe(1);
    expect(output.integrityWarning).toBeFalsy();
  });

  it("coerces a null quantity to one", async () => {
    const nullQuantity = {
      items: [
        { kind: "product", lineTotal: 10, name: "Product", quantity: null },
      ],
      merchant: { name: "Store" },
      payment: { method: "other" },
      totals: { total: 10 },
      transaction: {},
    } as unknown as ReceiptInformationExtraction;

    const engine = createEngine({ handler: () => nullQuantity, id: "parsing" });
    const { result } = await engine.execute();
    const output = result as FunctionOutput;

    expect(output.extraction.items[0].quantity).toBe(1);
  });

  it("leaves unprinted unit price, subtotal and gst absent", async () => {
    const sparse = {
      items: [{ lineTotal: 10, name: "Product" }],
      merchant: { name: "Store" },
      payment: { method: "other" },
      totals: { total: 10 },
      transaction: {},
    } as unknown as ReceiptInformationExtraction;

    const engine = createEngine({ handler: () => sparse, id: "parsing" });
    const { result } = await engine.execute();
    const output = result as FunctionOutput;

    expect(output.extraction.items[0].unitPrice).toBeUndefined();
    expect(output.extraction.totals.subtotal).toBeUndefined();
    expect(output.extraction.totals.gst).toBeUndefined();
  });

  it("completes without integrity warning when subtotal and gst are present", async () => {
    const fullExtraction: ReceiptInformationExtraction = {
      items: [{ kind: "product", lineTotal: 10, name: "Product", quantity: 1 }],
      merchant: { abn: "12345678901", name: "Full Store" },
      payment: { method: "card" },
      totals: { gst: 0.91, subtotal: 10, total: 10 },
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
    expect(output.extraction.totals.subtotal).toBe(10);
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

  it("stores the OCR transcript as soon as it is produced", async () => {
    const engine = createEngine(undefined, ["store-transcript"]);
    await engine.execute();

    expect(mockSet).toHaveBeenCalledWith({ transcript: "FAKE OCR TRANSCRIPT" });
  });

  it("keeps the OCR transcript when parsing fails", async () => {
    const engine = createEngine(
      {
        handler: () => {
          throw new Error("parse blew up");
        },
        id: "parsing",
      },
      ["store-transcript"]
    );

    await engine.execute().catch(() => {});

    expect(mockSet).toHaveBeenCalledWith({ transcript: "FAKE OCR TRANSCRIPT" });
  });
});
