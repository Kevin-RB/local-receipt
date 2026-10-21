import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetClientSubscriptionToken =
  vi.fn<
    (
      app: unknown,
      args: { channel: { name: string }; topics: string[] }
    ) => Promise<string>
  >();
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

const { fetchReceiptsSubscriptionToken } = await import("./actions");

describe("fetchReceiptsSubscriptionToken", () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
    mockGetClientSubscriptionToken.mockClear();
    mockGetClientSubscriptionToken.mockResolvedValue("token-abc");
  });

  it("mints a token for the session user's own channel", async () => {
    await expect(fetchReceiptsSubscriptionToken()).resolves.toBe("token-abc");
    expect(mockGetClientSubscriptionToken).toHaveBeenCalledOnce();

    const [[, args]] = mockGetClientSubscriptionToken.mock.calls;

    // The channel is the session's, never a caller-supplied id — there is no
    // id to forge and so no per-receipt ownership check to bypass.
    expect(args.channel.name).toBe("user:user-1");
    expect(args.topics).toStrictEqual(["state"]);
  });

  it("throws for unauthenticated requests", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(fetchReceiptsSubscriptionToken()).rejects.toThrow(
      "Unauthorized"
    );
    expect(mockGetClientSubscriptionToken).not.toHaveBeenCalled();
  });
});
