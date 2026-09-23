import { describe, expect, it, vi, beforeEach } from "vitest";

const receiptId = "123e4567-e89b-12d3-a456-426614174000";

const mockFindReceiptByIdForOwner = vi
  .fn<
    (
      id: string,
      ownerId: string
    ) => Promise<{ id: string; objectKey: string; status: string } | null>
  >()
  .mockResolvedValue({
    id: receiptId,
    objectKey: `${receiptId}.jpg`,
    status: "uploading",
  });

const mockCreatePresignedUrl = vi
  .fn<() => Promise<string>>()
  .mockResolvedValue("http://rustfs:9000/receipts/abc.jpg?signature=xyz");

// @ts-expect-error mock types don't need to match Drizzle internals
vi.mock(import("@/lib/db"), () => ({
  findReceiptByIdForOwner: mockFindReceiptByIdForOwner,
}));

const mockGetSession = vi.fn<() => Promise<{ user: { id: string } } | null>>();

// @ts-expect-error mock types don't need to match Better Auth internals
vi.mock(import("@/lib/auth"), () => ({
  auth: { api: { getSession: mockGetSession } },
}));

vi.mock(import("@/lib/storage/client"), () => ({
  BUCKET: "receipts",
  createPresignedUrl: mockCreatePresignedUrl,
  presignEndpointForHost: vi
    .fn<() => string>()
    .mockReturnValue("localhost:9000"),
}));

vi.mock(import("@/lib/storage/content-type"), () => ({
  contentTypeFromKey: vi
    .fn<(key: string) => string>()
    .mockReturnValue("image/jpeg"),
}));

const { POST } = await import("./route");

const params = Promise.resolve({ receiptId });

describe("POST /api/upload/:id/retry", () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
    mockFindReceiptByIdForOwner.mockResolvedValue({
      id: receiptId,
      objectKey: `${receiptId}.jpg`,
      status: "uploading",
    });
  });

  it("rejects unauthenticated requests", async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await POST(
      new Request("http://localhost/api/upload", { method: "POST" }),
      { params }
    );

    expect(res.status).toBe(401);
  });

  it("rejects requests for a receipt the user does not own", async () => {
    mockFindReceiptByIdForOwner.mockResolvedValue(null);

    const res = await POST(
      new Request("http://localhost/api/upload", { method: "POST" }),
      { params }
    );

    expect(res.status).toBe(404);
    expect(mockFindReceiptByIdForOwner).toHaveBeenCalledWith(
      receiptId,
      "user-1"
    );
  });

  it("returns a presigned url for a receipt the user owns", async () => {
    const res = await POST(
      new Request("http://localhost/api/upload", { method: "POST" }),
      { params }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toStrictEqual({
      receiptId,
      uploadUrl: "http://rustfs:9000/receipts/abc.jpg?signature=xyz",
    });
  });

  it("rejects uploads that are not in the uploading state", async () => {
    mockFindReceiptByIdForOwner.mockResolvedValue({
      id: receiptId,
      objectKey: `${receiptId}.jpg`,
      status: "done",
    });

    const res = await POST(
      new Request("http://localhost/api/upload", { method: "POST" }),
      { params }
    );

    expect(res.status).toBe(400);
  });
});
