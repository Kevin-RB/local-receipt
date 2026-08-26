import { describe, expect, it, vi, beforeEach } from "vitest";

const {
  mockDelete,
  mockDeleteObject,
  mockDeleteWhere,
  mockFindFirst,
  mockGetSession,
  mockRevalidatePath,
} = vi.hoisted(() => {
  const deleteWhere = vi.fn<() => Promise<void>>().mockResolvedValue();
  const deleteTable = vi
    .fn<(table: unknown) => { where: typeof deleteWhere }>()
    .mockReturnValue({ where: deleteWhere });

  const findFirst = vi
    .fn<
      () => Promise<{
        minioObjectKey: string | null;
        status: string;
      } | null>
    >()
    .mockResolvedValue({ minioObjectKey: "abc.jpg", status: "done" });

  return {
    mockDelete: deleteTable,
    mockDeleteObject: vi.fn<() => Promise<void>>().mockResolvedValue(),
    mockDeleteWhere: deleteWhere,
    mockFindFirst: findFirst,
    mockGetSession: vi
      .fn<() => Promise<{ user: { id: string } } | null>>()
      .mockResolvedValue({ user: { id: "user-1" } }),
    mockRevalidatePath: vi.fn<(path: string) => undefined>(),
  };
});

// @ts-expect-error mock types don't match Drizzle internals
vi.mock(import("@/lib/db"), () => ({
  db: {
    delete: mockDelete,
    query: { receipts: { findFirst: mockFindFirst } },
  },
  receipts: {},
}));

// @ts-expect-error mock types don't match Better Auth internals
vi.mock(import("@/lib/auth"), () => ({
  auth: { api: { getSession: mockGetSession } },
}));

vi.mock(import("next/headers"), () => ({
  headers: () => Promise.resolve(new Headers()),
}));

vi.mock(import("@/lib/minio/client"), () => ({
  BUCKET: "receipts",
  deleteObject: mockDeleteObject,
}));

vi.mock(import("next/cache"), () => ({
  revalidatePath: mockRevalidatePath,
}));

const { deleteReceipt } = await import("./actions");

const receiptId = "123e4567-e89b-12d3-a456-426614174000";

describe(deleteReceipt, () => {
  beforeEach(() => {
    mockGetSession.mockClear();
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
    mockFindFirst.mockClear();
    mockFindFirst.mockResolvedValue({
      minioObjectKey: "abc.jpg",
      status: "done",
    });
    mockDeleteObject.mockClear();
    mockDeleteWhere.mockClear();
    mockDelete.mockClear();
    mockRevalidatePath.mockClear();
  });

  it("rejects unauthenticated requests without touching the database", async () => {
    mockGetSession.mockResolvedValueOnce(null);

    const result = await deleteReceipt(receiptId);

    expect(result).toStrictEqual({
      error: "Receipt not found",
      success: false,
    });
    expect(mockFindFirst).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockDeleteObject).not.toHaveBeenCalled();
  });

  it("returns not-found for another user's receipt without mutating anything", async () => {
    mockFindFirst.mockResolvedValueOnce(null);

    const result = await deleteReceipt(receiptId);

    expect(result).toStrictEqual({
      error: "Receipt not found",
      success: false,
    });
    expect(mockDeleteObject).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("scopes the ownership lookup to the session user", async () => {
    await deleteReceipt(receiptId);

    expect(mockFindFirst).toHaveBeenCalledExactlyOnceWith({
      where: { id: receiptId, userId: "user-1" },
    });
  });

  it("deletes the MinIO object and the row for the owner", async () => {
    const result = await deleteReceipt(receiptId);

    expect(result).toStrictEqual({ success: true });
    expect(mockDeleteObject).toHaveBeenCalledExactlyOnceWith({
      bucket: "receipts",
      key: "abc.jpg",
    });
    expect(mockDeleteWhere).toHaveBeenCalledWith(
      expect.objectContaining({
        queryChunks: expect.arrayContaining([receiptId]),
      })
    );
    expect(mockRevalidatePath).toHaveBeenCalledExactlyOnceWith("/");
  });

  it("deletes the row without MinIO when there is no object key", async () => {
    mockFindFirst.mockResolvedValueOnce({
      minioObjectKey: null,
      status: "uploading",
    });

    const result = await deleteReceipt(receiptId);

    expect(result).toStrictEqual({ success: true });
    expect(mockDeleteObject).not.toHaveBeenCalled();
    expect(mockDeleteWhere).toHaveBeenCalledOnce();
  });

  it("returns an error when deletion fails", async () => {
    mockDeleteObject.mockRejectedValueOnce(new Error("connection refused"));

    const result = await deleteReceipt(receiptId);

    expect(result).toStrictEqual({
      error: "Failed to delete receipt",
      success: false,
    });
  });
});
