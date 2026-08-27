import { describe, expect, it, vi, beforeEach } from "vitest";

const receiptId = "123e4567-e89b-12d3-a456-426614174000";

const mockFindReceiptByIdForOwner = vi
  .fn<(id: string, ownerId: string) => Promise<{ id: string } | null>>()
  .mockResolvedValue({ id: receiptId });

const mockGetClientSubscriptionToken = vi
  .fn<() => Promise<string>>()
  .mockResolvedValue("token-abc");

// @ts-expect-error mock types don't need to match Drizzle internals
vi.mock(import("@/lib/db"), () => ({
  findReceiptByIdForOwner: mockFindReceiptByIdForOwner,
}));

const mockGetSession = vi.fn<() => Promise<{ user: { id: string } } | null>>();

// @ts-expect-error mock types don't need to match Better Auth internals
vi.mock(import("@/lib/auth"), () => ({
  auth: { api: { getSession: mockGetSession } },
}));

vi.mock(import("next/headers"), () => ({
  headers: () => Promise.resolve(new Headers()),
}));

// @ts-expect-error mock types don't need to match Inngest internals
vi.mock(import("inngest/react"), () => ({
  getClientSubscriptionToken: mockGetClientSubscriptionToken,
}));

const { fetchReceiptSubscriptionToken } = await import("./actions");

describe("fetchReceiptSubscriptionToken", () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
    mockFindReceiptByIdForOwner.mockResolvedValue({ id: receiptId });
    mockGetClientSubscriptionToken.mockClear();
    mockGetClientSubscriptionToken.mockResolvedValue("token-abc");
  });

  it("mints a token for a receipt the session user owns", async () => {
    await expect(fetchReceiptSubscriptionToken(receiptId)).resolves.toBe(
      "token-abc"
    );
    expect(mockFindReceiptByIdForOwner).toHaveBeenCalledWith(
      receiptId,
      "user-1"
    );
    expect(mockGetClientSubscriptionToken).toHaveBeenCalledOnce();
  });

  it("throws for unauthenticated requests", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(fetchReceiptSubscriptionToken(receiptId)).rejects.toThrow(
      "Unauthorized"
    );
    expect(mockGetClientSubscriptionToken).not.toHaveBeenCalled();
  });

  it("throws for a receipt the session user does not own", async () => {
    mockFindReceiptByIdForOwner.mockResolvedValue(null);

    await expect(fetchReceiptSubscriptionToken(receiptId)).rejects.toThrow(
      "Receipt not found"
    );
    expect(mockGetClientSubscriptionToken).not.toHaveBeenCalled();
  });
});
