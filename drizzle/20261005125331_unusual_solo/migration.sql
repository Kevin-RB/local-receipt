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
ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_discount_is_not_positive" CHECK ("kind" <> 'discount' OR "line_total" <= 0);
