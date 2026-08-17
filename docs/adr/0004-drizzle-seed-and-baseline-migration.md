# ADR-0004: Drizzle-seed into a dedicated seed database; single baseline migration

Date: 2026-08-17

## Status

Accepted

## Context

The database schema was normalized to flat queryable columns (#31), but two maintenance debts remained:

- **Seeding** ran an ad-hoc `lib/db/seed.ts` script that hand-wrote `db.insert(...)` calls for a single hard-coded receipt. Every schema change meant editing that script by hand, and it wrote demo rows straight into the `receipts` database, mixing fake data with real scanned receipts.
- **Migrations** did not match history: early schema work had been applied with `drizzle-kit push`, so `drizzle/` recorded only the final change on top of an outdated chain. `drizzle-kit generate` therefore could not produce clean diffs.

The `drizzle-kit` CLI (rc.4) has no `seed` command, so the standard seeding path is the `drizzle-seed` library run through the project's `db:seed` script.

## Decision

- Rewrite `lib/db/seed.ts` to drive the `drizzle-seed` library: `reset()` (TRUNCATE CASCADE) then `seed()` with refined generators and a fixed PRNG seed. The seed targets a dedicated `receipts_seed` database (default constant, overridable via `SEED_DATABASE_URL`) so the real `receipts` database is never touched.
- Squash `drizzle/` to a single baseline migration that captures the current schema from empty, deleting the four prior incremental migrations. `drizzle-kit generate` now diffs against the baseline.

## Consequences

- Seeded demo data is generated (plausible-but-fake), not curated: per-column generators draw independently, so line-item name/price/quantity and receipt totals need not reconcile — integrity warnings are part of the generated set.
- Re-running `pnpm db:seed` truncates and re-derives identical data (same PRNG seed), and is idempotent.
- Existing databases built from the old migration chain must be recreated from the baseline; there is no upgrade path from the removed migrations.
- Real scanned receipts stay in the `receipts` database; to view demo data, run the app against `receipts_seed`.

## Related

- Issue #32 (seed standardisation and baseline migration)
- Issue #25 (schema normalization parent)
- Issue #31 (flat schema that the baseline captures)
