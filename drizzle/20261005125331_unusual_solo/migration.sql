-- Hand-written data repair, appended to the `CHECK` that `pnpm db:generate`
-- emitted into this same file (the snapshot records only the constraint).
--
-- ADR-0007: a discount is a line item of kind `discount` carrying a negative
-- line total. Rows written before the coercion existed can hold a discount with
-- a positive line total — the kind was stored, the sign left as typed — and the
-- constraint would reject them, so repair them first. This mirrors
-- `coerceLineItem`: the sign follows the kind, and the unit price is negated
-- alongside so quantity × unit price still reconciles to the total.
--
-- Only the `kind = 'discount'` direction is repaired. The reverse reading — a
-- negative line total meaning the row *is* a discount — is an extraction-time
-- judgement about what a receipt printed, so a stored row keeps whatever kind
-- it was saved with.
UPDATE "receipt_items"
SET
  "line_total" = -"line_total",
  "unit_price" = -"unit_price"
WHERE "kind" = 'discount' AND "line_total" > 0;
--> statement-breakpoint
-- Flipping a sign moves the item sum, so `has_integrity_warning` has to be
-- recomputed or every list view — the receipts-table Integrity badge, the
-- overview chart, chat `list-receipts` — keeps reporting the pre-repair verdict
-- until the receipt is next saved, and disagrees with the edit form's live bar.
--
-- This recomputes every receipt rather than only the repaired ones. It has to
-- run *after* the UPDATE above, by which point the repaired rows no longer
-- satisfy `line_total > 0` and cannot be identified; capturing their ids first
-- would need a temp table. A blanket recompute is a no-op for every receipt the
-- repair did not touch, because `has_integrity_warning` is already derived from
-- these same items and total by `reconcile()` at write time.
--
-- The predicate mirrors `reconcile()` in `lib/receipt/integrity.ts`: the sum of
-- every line item (surcharges included) against `total`, matching within a cent,
-- and a receipt with no stated total always matching.
UPDATE "receipts" AS r
SET "has_integrity_warning" = NOT (
  r."total" IS NULL
  OR abs(
    r."total" - coalesce(
      (SELECT sum(i."line_total") FROM "receipt_items" AS i WHERE i."receipt_id" = r."id"),
      0
    )
  ) < 0.01
);
--> statement-breakpoint
ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_discount_is_not_positive" CHECK ("kind" <> 'discount' OR "line_total" <= 0);
