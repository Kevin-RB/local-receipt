import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockDb, insertedRows } = vi.hoisted(() => {
  const rows: Record<string, unknown>[] = [];

  const db = {
    delete: () => ({ where: () => ({ execute: () => Promise.resolve(1) }) }),
    insert: () => ({
      values: (values: Record<string, unknown>) => {
        rows.push(values);
        return { returning: () => Promise.resolve([values]) };
      },
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          execute: () => Promise.resolve([]),
          limit: () => ({ execute: () => Promise.resolve([]) }),
        }),
      }),
    }),
    update: () => ({
      set: () => ({ where: () => ({ execute: () => Promise.resolve(1) }) }),
    }),
  };

  return { insertedRows: rows, mockDb: db };
});

// The drizzle adapter only calls back into `db` at request time, so a
// functional mock is enough to run the real sign-up endpoint.
// @ts-expect-error the mock misses drizzle's exact builder types
vi.mock(import("@/lib/db"), () => ({ db: mockDb }));

process.env.BETTER_AUTH_SECRET = "test-only-secret";
process.env.BETTER_AUTH_URL = "http://localhost:3000";

const { auth } = await import("@/lib/auth");

const CODE = "correct-horse-battery-staple";
const EMAIL = "ada@example.com";

const signUpBody = {
  email: EMAIL,
  inviteCode: CODE,
  name: "Ada Lovelace",
  password: "password123",
};

describe("invite-code gate at the sign-up endpoint", () => {
  beforeEach(() => {
    process.env.INVITE_CODE = CODE;
    insertedRows.length = 0;
  });

  afterEach(() => {
    process.env.INVITE_CODE = "";
  });

  it("creates an account with the correct invite code", async () => {
    const result = await auth.api.signUpEmail({ body: signUpBody });

    expect(result.user.email).toBe(EMAIL);
    expect(result.user.name).toBe("Ada Lovelace");
    expect(result.token).toBeTruthy();
    expect(insertedRows.some((row) => row.email === EMAIL)).toBeTruthy();
    expect(
      insertedRows.some((row) => row.providerId === "credential")
    ).toBeTruthy();
  });

  it("never persists the invite code", async () => {
    await auth.api.signUpEmail({ body: signUpBody });

    const userRow = insertedRows.find((row) => row.email === EMAIL);
    expect(userRow).toBeDefined();
    expect(userRow?.inviteCode).toBeNull();
    expect(userRow?.invite_code).toBeUndefined();
  });

  it("rejects sign-up with a wrong invite code", async () => {
    await expect(
      auth.api.signUpEmail({
        body: { ...signUpBody, inviteCode: "wrong-code" },
      })
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(insertedRows).toHaveLength(0);
  });

  it("rejects sign-up without an invite code", async () => {
    const { inviteCode: _omitted, ...body } = signUpBody;

    await expect(auth.api.signUpEmail({ body })).rejects.toMatchObject({
      statusCode: 400,
    });

    expect(insertedRows).toHaveLength(0);
  });
});
