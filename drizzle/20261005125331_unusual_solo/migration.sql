-- ADR-0007: a discount is a line item of kind `discount` carrying a negative
-- line total. Rows stored before the coercion existed can hold a discount with
-- a positive line total (the kind was stored, the sign was left as typed), so
-- repair them before the constraint would reject them. The repair mirrors
-- `normalizeLineItems`: the sign follows the kind, and the unit price is
-- negated alongside so quantity × unit price still reconciles to the total.
UPDATE "receipt_items"
SET
  "line_total" = -"line_total",
  "unit_price" = -"unit_price"
WHERE "kind" = 'discount' AND "line_total" > 0;
--> statement-breakpoint
ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_discount_is_not_positive" CHECK ("kind" <> 'discount' OR "line_total" <= 0);
