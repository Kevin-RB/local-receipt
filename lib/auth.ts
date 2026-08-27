import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth/minimal";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/lib/db";
import { account, session, user, verification } from "@/lib/db/schema/auth";

import { inviteCodeGate } from "./auth/invite-code";

export const auth = betterAuth({
  advanced: {
    ipAddress: {
      ipAddressHeaders: ["cf-connecting-ip"],
    },
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { account, session, user, verification },
  }),
  emailAndPassword: {
    enabled: true,
  },
  hooks: {
    before: inviteCodeGate,
  },
  plugins: [nextCookies()],
  rateLimit: {
    enabled: true,
  },
  user: {
    additionalFields: {
      inviteCode: {
        input: true,
        required: false,
        returned: false,
        // The gate validates the code in a hook; it is never persisted.
        transform: { input: () => null },
        type: "string",
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
