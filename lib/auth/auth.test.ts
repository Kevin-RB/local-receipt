import { describe, expect, it, vi } from "vitest";

// @ts-expect-error the adapter only calls back into `db` at request time
vi.mock(import("@/lib/db"), () => ({ db: {} }));

process.env.BETTER_AUTH_URL = "http://localhost:3000";

const { auth } = await import("@/lib/auth");

describe("auth wiring", () => {
  it("registers the invite-code gate as a before hook", () => {
    expect(auth.options.hooks?.before).toBeTypeOf("function");
  });

  it("accepts an invite code input field on sign-up", () => {
    expect(auth.options.user?.additionalFields?.inviteCode).toMatchObject({
      input: true,
      returned: false,
      type: "string",
    });
  });

  it("enables rate limiting", () => {
    expect(auth.options.rateLimit?.enabled).toBeTruthy();
  });

  it("resolves the client IP from the Cloudflare proxy header", () => {
    expect(auth.options.advanced?.ipAddress?.ipAddressHeaders).toContain(
      "cf-connecting-ip"
    );
  });
});
