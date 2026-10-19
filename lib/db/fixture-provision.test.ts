import { describe, expect, it } from "vitest";

import { FIXTURE_EMAIL } from "@/lib/db/fixture";
import {
  appliedPasswordOutcome,
  isBlockedByForeignReceipts,
  isCanonicalFixtureAccount,
  missingCategorySlugs,
  plannedPasswordOutcome,
} from "@/lib/db/fixture-provision";

const emptyState = {
  accountExists: false,
  fixtureReceiptsPresent: 0,
  foreignReceipts: 0,
  passwordMatches: null,
  userExists: false,
};

const appliedFixture = (overrides: {
  accountCreated: boolean;
  passwordReset: boolean;
}) => ({
  accountCreated: overrides.accountCreated,
  itemsInserted: 0,
  passwordReset: overrides.passwordReset,
  receiptsInserted: 0,
  userCreated: false,
});

describe(isCanonicalFixtureAccount, () => {
  it("recognises the default agent account", () => {
    expect(isCanonicalFixtureAccount(FIXTURE_EMAIL)).toBeTruthy();
  });

  it("does not treat another account as the canonical one", () => {
    expect(isCanonicalFixtureAccount("owner@example.com")).toBeFalsy();
  });
});

describe(isBlockedByForeignReceipts, () => {
  it("blocks an account that already has receipts", () => {
    expect(
      isBlockedByForeignReceipts({ foreignReceipts: 3 }, false)
    ).toBeTruthy();
  });

  it("allows it when forced", () => {
    expect(
      isBlockedByForeignReceipts({ foreignReceipts: 3 }, true)
    ).toBeFalsy();
  });

  it("does not block an account with only fixture receipts", () => {
    expect(
      isBlockedByForeignReceipts({ foreignReceipts: 0 }, false)
    ).toBeFalsy();
  });
});

describe(plannedPasswordOutcome, () => {
  it("creates the credential when there is no account", () => {
    expect(plannedPasswordOutcome(emptyState, true)).toBe("created");
    expect(plannedPasswordOutcome(emptyState, false)).toBe("created");
  });

  it("leaves the canonical password alone when it already matches", () => {
    expect(
      plannedPasswordOutcome(
        { accountExists: true, passwordMatches: true },
        true
      )
    ).toBe("matches");
  });

  it("resets a drifted canonical password", () => {
    expect(
      plannedPasswordOutcome(
        { accountExists: true, passwordMatches: false },
        true
      )
    ).toBe("reset");
  });

  it("never resets a non-canonical account", () => {
    expect(
      plannedPasswordOutcome(
        { accountExists: true, passwordMatches: false },
        false
      )
    ).toBe("unchanged");
    expect(
      plannedPasswordOutcome(
        { accountExists: true, passwordMatches: true },
        false
      )
    ).toBe("unchanged");
  });
});

describe(appliedPasswordOutcome, () => {
  it("reports creation, then reset, then a matching no-op", () => {
    expect(
      appliedPasswordOutcome(
        appliedFixture({ accountCreated: true, passwordReset: false }),
        true
      )
    ).toBe("created");
    expect(
      appliedPasswordOutcome(
        appliedFixture({ accountCreated: false, passwordReset: true }),
        true
      )
    ).toBe("reset");
    expect(
      appliedPasswordOutcome(
        appliedFixture({ accountCreated: false, passwordReset: false }),
        true
      )
    ).toBe("matches");
  });

  it("reports a non-canonical account as unchanged", () => {
    expect(
      appliedPasswordOutcome(
        appliedFixture({ accountCreated: false, passwordReset: false }),
        false
      )
    ).toBe("unchanged");
  });
});

describe(missingCategorySlugs, () => {
  const fixture = {
    asOf: "2026-10-19",
    email: "trace-test@example.com",
    receipts: [
      {
        items: [
          { categorySlug: "produce" },
          { categorySlug: null },
          { categorySlug: "fuel" },
        ],
      },
    ],
  } as unknown as Parameters<typeof missingCategorySlugs>[0];

  it("names only the slugs the taxonomy is missing", () => {
    const categoryIds = new Map([["produce", "id-1"]]);

    expect(missingCategorySlugs(fixture, categoryIds)).toStrictEqual(["fuel"]);
  });

  it("returns nothing when every slug is present", () => {
    const categoryIds = new Map([
      ["produce", "id-1"],
      ["fuel", "id-2"],
    ]);

    expect(missingCategorySlugs(fixture, categoryIds)).toStrictEqual([]);
  });
});
