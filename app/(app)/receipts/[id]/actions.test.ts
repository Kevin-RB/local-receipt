import { describe, expect, it, vi, beforeEach } from "vitest";

import type { UpdateReceiptInput } from "./schema";

const {
  mockDelete,
  mockDeleteWhere,
  mockFindFirst,
  mockGetSession,
  mockInsert,
  mockInsertValues,
  mockRevalidatePath,
  mockReceiptDateTimeToDate,
  mockSet,
  mockSetWhere,
  mockTransaction,
  mockUpdate,
} = vi.hoisted(() => {
  const setWhere = vi.fn<() => Promise<void>>().mockResolvedValue();
  const setValue = vi
    .fn<(payload: Record<string, unknown>) => { where: typeof setWhere }>()
    .mockReturnValue({ where: setWhere });
  const updateTable = vi
    .fn<(table: unknown) => { set: typeof setValue }>()
    .mockReturnValue({ set: setValue });

  const deleteWhere = vi.fn<() => Promise<void>>().mockResolvedValue();
  const deleteTable = vi
    .fn<(table: unknown) => { where: typeof deleteWhere }>()
    .mockReturnValue({ where: deleteWhere });

  const insertValues = vi.fn<() => Promise<void>>().mockResolvedValue();
  const insertTable = vi
    .fn<(table: unknown) => { values: typeof insertValues }>()
    .mockReturnValue({ values: insertValues });

  const tx = {
    delete: deleteTable,
    insert: insertTable,
    update: updateTable,
  };

  const transaction = vi
    .fn<
      (
        fn: (tx: {
          delete: typeof deleteTable;
          insert: typeof insertTable;
          update: typeof updateTable;
        }) => Promise<void>
      ) => Promise<void>
    >()
    .mockImplementation((fn) => fn(tx));

  const findFirst = vi
    .fn<() => Promise<{ status: string } | null>>()
    .mockResolvedValue({ status: "done" });

  const revalidatePath = vi.fn<(path: string) => undefined>();
  const receiptDateTimeToDate = vi
    .fn<(datetime: string) => Date>()
    .mockReturnValue(new Date("2026-01-01T00:00:00.000Z"));
  const getSession = vi
    .fn<() => Promise<{ user: { id: string } } | null>>()
    .mockResolvedValue({ user: { id: "user-1" } });

  return {
    mockDelete: deleteTable,
    mockDeleteWhere: deleteWhere,
    mockFindFirst: findFirst,
    mockGetSession: getSession,
    mockInsert: insertTable,
    mockInsertValues: insertValues,
    mockReceiptDateTimeToDate: receiptDateTimeToDate,
    mockRevalidatePath: revalidatePath,
    mockSet: setValue,
    mockSetWhere: setWhere,
    mockTransaction: transaction,
    mockUpdate: updateTable,
  };
});

// @ts-expect-error mock types don't match Drizzle internals
vi.mock(import("@/lib/db"), () => ({
  db: {
    query: { receipts: { findFirst: mockFindFirst } },
    transaction: mockTransaction,
  },
  receiptItems: {},
  receipts: {},
}));

// @ts-expect-error mock types don't match Better Auth internals
vi.mock(import("@/lib/auth"), () => ({
  auth: { api: { getSession: mockGetSession } },
}));

vi.mock(import("next/headers"), () => ({
  headers: () => Promise.resolve(new Headers()),
}));

vi.mock(import("next/cache"), () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock(import("@/lib/receipt/datetime"), () => ({
  RECEIPT_TIMEZONE: "Australia/Brisbane" as const,
  receiptDateTimeToDate: mockReceiptDateTimeToDate,
  receiptDateToLocalString: vi.fn<(date: Date) => string>(),
}));

const { updateReceipt } = await import("./actions");

const receiptId = "123e4567-e89b-12d3-a456-426614174000";

const validInput: UpdateReceiptInput = {
  items: [
    {
      lineTotal: 10,
      name: "Milk",
      quantity: 1,
      unitPrice: 10,
    },
    {
      lineTotal: 5.5,
      name: "Bread",
      quantity: 1,
      unitPrice: 5.5,
    },
  ],
  merchant: {
    address: "1 Main St",
    name: "Coles",
    storeId: "1234",
  },
  payment: { method: "card" },
  receiptId,
  totals: { gst: 1.5, subtotal: 15.5, total: 15.5 },
  transaction: {
    datetime: "2026-01-01T10:00:00Z",
    receiptNumber: "R-123",
  },
};

describe(updateReceipt, () => {
  beforeEach(() => {
    mockGetSession.mockClear();
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
    mockFindFirst.mockClear();
    mockFindFirst.mockResolvedValue({ status: "done" });
    mockSetWhere.mockClear();
    mockSet.mockClear();
    mockUpdate.mockClear();
    mockDeleteWhere.mockClear();
    mockDelete.mockClear();
    mockInsertValues.mockClear();
    mockInsert.mockClear();
    mockRevalidatePath.mockClear();
    mockTransaction.mockClear();
  });

  it("rejects payloads with negative totals", async () => {
    const result = await updateReceipt({
      ...validInput,
      totals: { ...validInput.totals, total: -10 },
    });

    expect(result).toStrictEqual({
      error: "Validation failed",
      success: false,
    });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("rejects payloads with an empty merchant name", async () => {
    const result = await updateReceipt({
      ...validInput,
      merchant: { ...validInput.merchant, name: "" },
    });

    expect(result).toStrictEqual({
      error: "Validation failed",
      success: false,
    });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("rejects payloads with negative line totals", async () => {
    const result = await updateReceipt({
      ...validInput,
      items: [{ ...validInput.items[0], lineTotal: -1 }],
    });

    expect(result).toStrictEqual({
      error: "Validation failed",
      success: false,
    });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("rejects payloads with a non-enum payment method", async () => {
    const result = await updateReceipt({
      ...validInput,
      payment: { method: "VISA" },
    } as unknown as UpdateReceiptInput);

    expect(result).toStrictEqual({
      error: "Validation failed",
      success: false,
    });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("rejects payloads with an invalid receipt id", async () => {
    const result = await updateReceipt({
      ...validInput,
      receiptId: "not-a-uuid",
    });

    expect(result).toStrictEqual({
      error: "Validation failed",
      success: false,
    });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("rejects payloads missing the required totals.total", async () => {
    const result = await updateReceipt({
      ...validInput,
      totals: { subtotal: 15.5 },
    } as UpdateReceiptInput);

    expect(result).toStrictEqual({
      error: "Validation failed",
      success: false,
    });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("updates the receipt and fully replaces all items in a transaction", async () => {
    const result = await updateReceipt(validInput);

    expect(result).toStrictEqual({ success: true });
    expect(mockTransaction).toHaveBeenCalledOnce();
    expect(mockUpdate).toHaveBeenCalledOnce();
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        gst: 1.5,
        merchantAddress: "1 Main St",
        merchantName: "Coles",
        merchantStoreId: "1234",
        paymentMethod: "card",
        receiptNumber: "R-123",
        subtotal: 15.5,
        total: 15.5,
      })
    );
    expect(mockDeleteWhere).toHaveBeenCalledWith(
      expect.objectContaining({
        queryChunks: expect.arrayContaining([receiptId]),
      })
    );
  });

  it("inserts the new items array into the receipt items table", async () => {
    await updateReceipt(validInput);

    expect(mockInsert).toHaveBeenCalledOnce();
    expect(mockInsertValues).toHaveBeenCalledExactlyOnceWith(
      validInput.items.map((item) => ({ ...item, receiptId }))
    );
  });

  it("syncs the transactionDateTime from the transaction datetime string", async () => {
    await updateReceipt(validInput);

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionDateTime: new Date("2026-01-01T00:00:00.000Z"),
      })
    );
  });

  it("skips the item insert when there are no items", async () => {
    const result = await updateReceipt({
      ...validInput,
      items: [],
      totals: { gst: 0, subtotal: 0, total: 0 },
    });

    expect(result).toStrictEqual({ success: true });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("stores a computed integrity warning when items do not sum to the total", async () => {
    await updateReceipt({
      ...validInput,
      items: [{ lineTotal: 10, name: "Milk", quantity: 1, unitPrice: 10 }],
      totals: { gst: 0, subtotal: 10, total: 20 },
    });

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ hasIntegrityWarning: true })
    );
  });

  it("stores no integrity warning when items sum to the total", async () => {
    await updateReceipt(validInput);

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ hasIntegrityWarning: false })
    );
  });

  it("returns an error when the database transaction fails", async () => {
    mockSetWhere.mockRejectedValueOnce(new Error("connection refused"));

    const result = await updateReceipt(validInput);

    expect(result).toStrictEqual({
      error: "Failed to save receipt",
      success: false,
    });
  });

  it("clears the transactionDateTime when the datetime field is empty", async () => {
    await updateReceipt({
      ...validInput,
      transaction: {
        ...validInput.transaction,
        datetime: undefined,
      },
    });

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ transactionDateTime: null })
    );
  });

  it("rejects updates to a receipt that is not in done status", async () => {
    mockFindFirst.mockResolvedValueOnce({ status: "processing" });

    const result = await updateReceipt(validInput);

    expect(result).toStrictEqual({
      error: "Receipt is not editable",
      success: false,
    });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("rejects updates to a receipt that does not exist", async () => {
    mockFindFirst.mockResolvedValueOnce(null);

    const result = await updateReceipt(validInput);

    expect(result).toStrictEqual({
      error: "Receipt is not editable",
      success: false,
    });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated requests without looking up or mutating", async () => {
    mockGetSession.mockResolvedValueOnce(null);

    const result = await updateReceipt(validInput);

    expect(result).toStrictEqual({
      error: "Receipt is not editable",
      success: false,
    });
    expect(mockFindFirst).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("returns not-found semantics for another user's receipt without mutating", async () => {
    mockFindFirst.mockResolvedValueOnce(null);

    const result = await updateReceipt(validInput);

    expect(result).toStrictEqual({
      error: "Receipt is not editable",
      success: false,
    });
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockSetWhere).not.toHaveBeenCalled();
  });

  it("scopes the ownership lookup to the session user", async () => {
    await updateReceipt(validInput);

    expect(mockFindFirst).toHaveBeenCalledExactlyOnceWith({
      where: { id: receiptId, userId: "user-1" },
    });
  });

  it("revalidates the receipt path after a successful save", async () => {
    await updateReceipt(validInput);

    expect(mockRevalidatePath).toHaveBeenCalledExactlyOnceWith(
      `/receipts/${receiptId}`
    );
  });
});
