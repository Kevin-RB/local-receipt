import { APIError } from "better-auth/api";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { assertInviteCode, assertInviteCodeGate } from "./invite-code";

const CODE = "correct-horse-battery-staple";

const captureError = (action: () => unknown): APIError => {
  try {
    action();
  } catch (error) {
    return error as APIError;
  }
  throw new Error("expected the action to throw");
};

describe(assertInviteCode, () => {
  beforeEach(() => {
    process.env.INVITE_CODE = CODE;
  });

  afterEach(() => {
    delete process.env.INVITE_CODE;
  });

  it("accepts the configured invite code", () => {
    expect(() => assertInviteCode(CODE)).not.toThrow();
  });

  it("rejects a missing or null invite code", () => {
    const error = captureError(() => assertInviteCode(null));
    expect(error).toBeInstanceOf(APIError);
  });

  it("rejects a wrong invite code", () => {
    const error = captureError(() => assertInviteCode("wrong-code"));
    expect(error).toBeInstanceOf(APIError);
  });

  it("rejects with a 400 invalid-code error message", () => {
    const error = captureError(() => assertInviteCode("wrong-code"));
    expect(error.statusCode).toBe(400);
    expect(error.body?.message).toBe("Invalid invite code");
  });

  it("stays closed when the code has not been configured", () => {
    delete process.env.INVITE_CODE;
    expect(() => assertInviteCode("")).toThrow(APIError);
    expect(() => assertInviteCode(CODE)).toThrow(APIError);
  });
});

describe(assertInviteCodeGate, () => {
  beforeEach(() => {
    process.env.INVITE_CODE = CODE;
  });

  afterEach(() => {
    delete process.env.INVITE_CODE;
  });

  it("passes through paths that are not sign-up", async () => {
    await expect(
      assertInviteCodeGate({ body: {}, path: "/sign-in/email" })
    ).resolves.toBeUndefined();
  });

  it("accepts sign-up with the correct invite code", async () => {
    await expect(
      assertInviteCodeGate({
        body: { email: "a@b.co", inviteCode: CODE },
        path: "/sign-up/email",
      })
    ).resolves.toBeUndefined();
  });

  it("rejects sign-up without an invite code", async () => {
    await expect(
      assertInviteCodeGate({
        body: { email: "a@b.co" },
        path: "/sign-up/email",
      })
    ).rejects.toThrow(APIError);
  });

  it("rejects sign-up with a wrong invite code", async () => {
    await expect(
      assertInviteCodeGate({
        body: { email: "a@b.co", inviteCode: "wrong" },
        path: "/sign-up/email",
      })
    ).rejects.toThrow("Invalid invite code");
  });
});
