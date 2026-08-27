import { createHash, timingSafeEqual } from "node:crypto";

import { APIError } from "better-auth/api";

const readInviteCode = () => process.env.INVITE_CODE ?? "";

const sequencesEqual = (a: string, b: string) => {
  const aHash = createHash("sha256").update(a).digest();
  const bHash = createHash("sha256").update(b).digest();
  return timingSafeEqual(aHash, bHash);
};

/**
 * Rejects sign-up when the submitted invite code does not match the
 * owner-configured invite code. A missing/unconfigured code always closes
 * registration (safe default) and never reveals whether the code was supplied.
 */
export const assertInviteCode = (inviteCode: string | null) => {
  const configured = readInviteCode();
  if (configured.length === 0 || inviteCode === null) {
    throw new APIError("BAD_REQUEST", { message: "Invalid invite code" });
  }
  if (!sequencesEqual(inviteCode, configured)) {
    throw new APIError("BAD_REQUEST", { message: "Invalid invite code" });
  }
};
