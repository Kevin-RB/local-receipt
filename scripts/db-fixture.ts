import { randomUUID } from "node:crypto";

import { hashPassword, verifyPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import "temporal-polyfill/global";

import { categories, db, receiptItems, receipts } from "@/lib/db";
import type { Fixture } from "@/lib/db/fixture";
import {
  buildFixture,
  FIXTURE_EMAIL,
  FIXTURE_PASSWORD,
} from "@/lib/db/fixture";
import { FixtureUsageError, parseFixtureOptions } from "@/lib/db/fixture-args";
import { account, user } from "@/lib/db/schema/auth";
import type { ReceiptInsert } from "@/lib/db/schema/receipt";
import {
  RECEIPT_TIMEZONE,
  receiptDateToISODateString,
} from "@/lib/receipt/datetime";

/**
 * Better Auth's synthetic issuer for password sign-in. It is
 * `local:${encodeURIComponent(providerId)}` (`createLocalAccountIssuer` in
 * `@better-auth/core`, which `better-auth` does not re-export), and the
 * sign-in lookup compares against this exact value.
 */
const CREDENTIAL_ISSUER = "local:credential";
const CREDENTIAL_PROVIDER = "credential";

const lineItemCount = (fixture: Fixture) =>
  fixture.receipts.reduce((sum, receipt) => sum + receipt.items.length, 0);

const dateRange = (fixture: Fixture) => {
  const dates = fixture.receipts
    .map((receipt) => receiptDateToISODateString(receipt.transactionDateTime))
    .toSorted();
  return `${dates[0]} .. ${dates.at(-1)}`;
};

const sharedSummaryLines = (fixture: Fixture) => [
  `  date range:  ${dateRange(fixture)}`,
  `  images:      none (the detail page shows "No image available")`,
];

const displayName = (email: string) => `Fixture ${email.split("@")[0]}`;

const isCanonicalFixtureAccount = (email: string) => email === FIXTURE_EMAIL;

/**
 * True when `hash` is a stored password for the fixture password. A malformed
 * hash is a mismatch, not a crash: the whole point is to repair the account.
 */
const passwordMatchesFixture = async (hash: string | null) => {
  if (!hash) {
    return false;
  }
  try {
    return await verifyPassword({ hash, password: FIXTURE_PASSWORD });
  } catch {
    return false;
  }
};

const loadCategoryIds = async () => {
  const rows = await db
    .select({ id: categories.id, slug: categories.slug })
    .from(categories);
  return new Map(rows.map((row) => [row.slug, row.id]));
};

const missingCategorySlugs = (
  fixture: Fixture,
  categoryIds: Map<string, string>
) => {
  const slugs = new Set<string>();
  for (const receipt of fixture.receipts) {
    for (const line of receipt.items) {
      if (line.categorySlug) {
        slugs.add(line.categorySlug);
      }
    }
  }
  return [...slugs].filter((slug) => !categoryIds.has(slug)).toSorted();
};

interface FixtureState {
  accountExists: boolean;
  fixtureReceiptsPresent: number;
  foreignReceipts: number;
  /** Null when there is no credential account at all. */
  passwordMatches: boolean | null;
  userExists: boolean;
}

const readFixtureState = async (fixture: Fixture): Promise<FixtureState> => {
  const [existingUser] = await db
    .select()
    .from(user)
    .where(eq(user.email, fixture.email))
    .limit(1);

  if (!existingUser) {
    return {
      accountExists: false,
      fixtureReceiptsPresent: 0,
      foreignReceipts: 0,
      passwordMatches: null,
      userExists: false,
    };
  }

  const [credential] = await db
    .select({ id: account.id, password: account.password })
    .from(account)
    .where(
      and(
        eq(account.userId, existingUser.id),
        eq(account.providerId, CREDENTIAL_PROVIDER)
      )
    )
    .limit(1);
  const passwordMatches = credential
    ? await passwordMatchesFixture(credential.password)
    : null;

  const existingReceipts = await db
    .select({ id: receipts.id })
    .from(receipts)
    .where(eq(receipts.userId, existingUser.id));
  const fixtureIds = new Set(fixture.receipts.map((receipt) => receipt.id));

  return {
    accountExists: Boolean(credential),
    fixtureReceiptsPresent: existingReceipts.filter((receipt) =>
      fixtureIds.has(receipt.id)
    ).length,
    foreignReceipts: existingReceipts.filter(
      (receipt) => !fixtureIds.has(receipt.id)
    ).length,
    passwordMatches,
    userExists: true,
  };
};

type PasswordOutcome = "created" | "matches" | "reset" | "unchanged";

/**
 * The canonical fixture account's password is part of its contract, so a drift
 * (someone changed it, or the row came from a different run) is repaired. Any
 * other account — the owner's included — keeps its password: it is only ever
 * given one when the account is created here.
 */
const plannedPasswordOutcome = (
  state: Pick<FixtureState, "accountExists" | "passwordMatches">,
  canonical: boolean
): PasswordOutcome => {
  if (!state.accountExists) {
    return "created";
  }
  if (!canonical) {
    return "unchanged";
  }
  return state.passwordMatches ? "matches" : "reset";
};

const describePassword = (outcome: PasswordOutcome, future: boolean) => {
  switch (outcome) {
    case "created": {
      return future
        ? `will be set to ${FIXTURE_PASSWORD}`
        : `set to ${FIXTURE_PASSWORD}`;
    }
    case "reset": {
      return future
        ? `will be reset to ${FIXTURE_PASSWORD} (it does not match)`
        : `reset to ${FIXTURE_PASSWORD} (it did not match)`;
    }
    case "matches": {
      return `already matches ${FIXTURE_PASSWORD}`;
    }
    case "unchanged": {
      return future
        ? "left unchanged (the account already exists)"
        : "left unchanged (the account already existed)";
    }
    default: {
      const unhandled: never = outcome;
      return unhandled;
    }
  }
};

const describeSignIn = (fixture: Fixture, outcome: PasswordOutcome) =>
  outcome === "unchanged"
    ? `Sign in at /sign-in with ${fixture.email} using its existing password; this run did not reset it.`
    : `Sign in at /sign-in with ${fixture.email} and ${FIXTURE_PASSWORD}.`;

const printPlan = (fixture: Fixture, state: FixtureState) => {
  const passwordLine = describePassword(
    plannedPasswordOutcome(state, isCanonicalFixtureAccount(fixture.email)),
    true
  );

  process.stdout.write(
    `${[
      `Fixture for ${fixture.email} (dry run — pass --apply to write)`,
      `  user:        ${state.userExists ? "exists" : "will be created"}`,
      `  password:    ${passwordLine}`,
      `  receipts:    ${fixture.receipts.length - state.fixtureReceiptsPresent} to insert, ${state.fixtureReceiptsPresent} already present`,
      `  line items:  ${lineItemCount(fixture)} in the corpus`,
      ...sharedSummaryLines(fixture),
      state.foreignReceipts > 0
        ? `  other rows:  ${state.foreignReceipts} existing receipt(s) left untouched (--force)`
        : "",
      "No changes written.",
    ]
      .filter(Boolean)
      .join("\n")}\n`
  );
};

interface AppliedFixture {
  accountCreated: boolean;
  itemsInserted: number;
  passwordReset: boolean;
  receiptsInserted: number;
  userCreated: boolean;
}

const applyFixture = async (
  fixture: Fixture,
  categoryIds: Map<string, string>
): Promise<AppliedFixture> =>
  await db.transaction(async (tx) => {
    const [existingUser] = await tx
      .select()
      .from(user)
      .where(eq(user.email, fixture.email))
      .limit(1);

    const userId = existingUser?.id ?? randomUUID();
    if (!existingUser) {
      await tx.insert(user).values({
        email: fixture.email,
        emailVerified: true,
        id: userId,
        name: displayName(fixture.email),
      });
    }

    const [credential] = await tx
      .select({ id: account.id, password: account.password })
      .from(account)
      .where(
        and(
          eq(account.userId, userId),
          eq(account.providerId, CREDENTIAL_PROVIDER)
        )
      )
      .limit(1);

    const accountCreated = !credential;
    let passwordReset = false;
    if (accountCreated) {
      await tx.insert(account).values({
        accountId: userId,
        id: randomUUID(),
        issuer: CREDENTIAL_ISSUER,
        password: await hashPassword(FIXTURE_PASSWORD),
        providerId: CREDENTIAL_PROVIDER,
        userId,
      });
    } else if (
      isCanonicalFixtureAccount(fixture.email) &&
      !(await passwordMatchesFixture(credential.password))
    ) {
      // The canonical account's credentials are part of the fixture contract,
      // so a drifted password is repaired rather than reported. Matching
      // passwords are left alone, which keeps a re-run a true no-op.
      await tx
        .update(account)
        .set({ password: await hashPassword(FIXTURE_PASSWORD) })
        .where(eq(account.id, credential.id));
      passwordReset = true;
    }

    const insertedReceipts = await tx
      .insert(receipts)
      .values(
        fixture.receipts.map(
          (receipt): ReceiptInsert => ({
            categorizedAt: receipt.categorizedAt,
            createdAt: receipt.createdAt,
            gst: receipt.gst,
            hasIntegrityWarning: receipt.hasIntegrityWarning,
            id: receipt.id,
            merchantAbn: receipt.merchantAbn,
            merchantAddress: receipt.merchantAddress,
            merchantName: receipt.merchantName,
            merchantStoreId: receipt.merchantStoreId,
            paymentMethod: receipt.paymentMethod,
            receiptNumber: receipt.receiptNumber,
            status: receipt.status,
            subtotal: receipt.subtotal,
            total: receipt.total,
            transactionDateTime: receipt.transactionDateTime,
            userId,
          })
        )
      )
      .onConflictDoNothing()
      .returning({ id: receipts.id });

    const insertedIds = new Set(insertedReceipts.map((receipt) => receipt.id));
    const itemRows = fixture.receipts.flatMap((receipt) =>
      insertedIds.has(receipt.id)
        ? receipt.items.map((line) => ({
            categoryId: line.categorySlug
              ? (categoryIds.get(line.categorySlug) ?? null)
              : null,
            categorySource: "ai" as const,
            kind: line.kind,
            lineTotal: line.lineTotal,
            name: line.name,
            quantity: line.quantity,
            receiptId: receipt.id,
            unitPrice: line.unitPrice,
          }))
        : []
    );

    if (itemRows.length > 0) {
      await tx.insert(receiptItems).values(itemRows);
    }

    return {
      accountCreated,
      itemsInserted: itemRows.length,
      passwordReset,
      receiptsInserted: insertedReceipts.length,
      userCreated: !existingUser,
    };
  });

const appliedPasswordOutcome = (
  applied: AppliedFixture,
  canonical: boolean
): PasswordOutcome => {
  if (applied.accountCreated) {
    return "created";
  }
  if (applied.passwordReset) {
    return "reset";
  }
  return canonical ? "matches" : "unchanged";
};

const printApplied = (
  fixture: Fixture,
  state: FixtureState,
  applied: AppliedFixture
) => {
  const passwordOutcome = appliedPasswordOutcome(
    applied,
    isCanonicalFixtureAccount(fixture.email)
  );

  process.stdout.write(
    `${[
      `Provisioned fixture for ${fixture.email}`,
      `  user:        ${applied.userCreated ? "created" : "exists"}`,
      `  password:    ${describePassword(passwordOutcome, false)}`,
      `  receipts:    inserted ${applied.receiptsInserted}, ${state.fixtureReceiptsPresent} already present`,
      `  line items:  inserted ${applied.itemsInserted}`,
      ...sharedSummaryLines(fixture),
      state.foreignReceipts > 0
        ? `  other rows:  ${state.foreignReceipts} existing receipt(s) left untouched`
        : "",
      "",
      describeSignIn(fixture, passwordOutcome),
    ]
      .filter(Boolean)
      .join("\n")}\n`
  );
};

const main = async () => {
  const options = parseFixtureOptions(process.argv.slice(2));
  const asOf = Temporal.Now.instant()
    .toZonedDateTimeISO(RECEIPT_TIMEZONE)
    .toPlainDate();
  const fixture = buildFixture({ asOf, email: options.email });

  const categoryIds = await loadCategoryIds();
  const missing = missingCategorySlugs(fixture, categoryIds);
  if (missing.length > 0) {
    throw new Error(
      `Missing categories: ${missing.join(", ")}. Run pnpm db:migrate first.`
    );
  }

  const state = await readFixtureState(fixture);

  if (state.foreignReceipts > 0 && !options.force) {
    process.stderr.write(
      `${[
        `${fixture.email} already has ${state.foreignReceipts} receipt(s) that are not part of the fixture.`,
        "Pass --force to add the fixture receipts alongside them; none of those receipts are modified.",
        "Nothing was written.",
      ].join("\n")}\n`
    );
    process.exitCode = 1;
    return;
  }

  if (!options.apply) {
    printPlan(fixture, state);
    return;
  }

  printApplied(fixture, state, await applyFixture(fixture, categoryIds));
};

try {
  await main();
} catch (error) {
  if (error instanceof FixtureUsageError) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  } else {
    throw error;
  }
} finally {
  await db.$client.end();
}
