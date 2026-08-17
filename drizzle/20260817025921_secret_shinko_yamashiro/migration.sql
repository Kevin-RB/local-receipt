ALTER TABLE "receipts" ADD COLUMN "merchant_abn" text;--> statement-breakpoint
ALTER TABLE "receipts" ADD COLUMN "merchant_address" text;--> statement-breakpoint
ALTER TABLE "receipts" ADD COLUMN "merchant_store_id" text;--> statement-breakpoint
ALTER TABLE "receipts" ADD COLUMN "payment_method" text;--> statement-breakpoint
ALTER TABLE "receipts" ADD COLUMN "total" numeric(10,2);--> statement-breakpoint
ALTER TABLE "receipts" ADD COLUMN "subtotal" numeric(10,2);--> statement-breakpoint
ALTER TABLE "receipts" ADD COLUMN "gst" numeric(10,2);--> statement-breakpoint

UPDATE "receipts"
SET
	"merchant_abn" = "merchant"->>'abn',
	"merchant_address" = "merchant"->>'address',
	"merchant_store_id" = "merchant"->>'storeId',
	"merchant_name" = COALESCE("merchant_name", "merchant"->>'name'),
	"payment_method" = CASE
		WHEN "payment" IS NULL OR "payment"->>'method' IS NULL THEN 'other'
		WHEN lower(trim("payment"->>'method')) = 'cash' THEN 'cash'
		WHEN lower(trim("payment"->>'method')) = 'card'
			OR lower(trim("payment"->>'method')) LIKE '%visa%'
			OR lower(trim("payment"->>'method')) LIKE '%mastercard%'
			OR lower(trim("payment"->>'method')) LIKE '%eftpos%'
			OR lower(trim("payment"->>'method')) LIKE '%debit%'
			OR lower(trim("payment"->>'method')) LIKE '%credit%' THEN 'card'
		ELSE 'other'
	END,
	"receipt_number" = COALESCE("receipt_number", "transaction"->>'receiptNumber'),
	"subtotal" = ("totals"->>'subtotal')::numeric(10,2),
	"total" = ("totals"->>'total')::numeric(10,2),
	"gst" = ("totals"->>'gst')::numeric(10,2),
	"transaction_datetime" = COALESCE(
		"transaction_datetime",
		("transaction"->>'datetime')::timestamp AT TIME ZONE 'Australia/Brisbane'
	);
--> statement-breakpoint

ALTER TABLE "receipts" DROP COLUMN "merchant";--> statement-breakpoint
ALTER TABLE "receipts" DROP COLUMN "payment";--> statement-breakpoint
ALTER TABLE "receipts" DROP COLUMN "totals";--> statement-breakpoint
ALTER TABLE "receipts" DROP COLUMN "transaction";--> statement-breakpoint

CREATE INDEX "receipts_merchant_name_lower_idx" ON "receipts" (lower("merchant_name"));--> statement-breakpoint
CREATE INDEX "receipts_transaction_datetime_index" ON "receipts" ("transaction_datetime");--> statement-breakpoint
CREATE INDEX "receipts_created_at_index" ON "receipts" ("created_at");--> statement-breakpoint
CREATE INDEX "receipts_payment_method_index" ON "receipts" ("payment_method");--> statement-breakpoint
ALTER TABLE "receipts" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
