CREATE TABLE "receipt_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"line_total" numeric(10,2) NOT NULL,
	"name" text NOT NULL,
	"quantity" numeric,
	"receipt_id" uuid NOT NULL,
	"unit_price" numeric(10,2)
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"gst" numeric(10,2),
	"has_integrity_warning" boolean DEFAULT false NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"merchant_abn" text,
	"merchant_address" text,
	"merchant_name" text,
	"merchant_store_id" text,
	"minio_object_key" text,
	"payment_method" text,
	"receipt_number" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"subtotal" numeric(10,2),
	"total" numeric(10,2),
	"transaction_datetime" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "receipts_merchant_name_lower_idx" ON "receipts" (lower("merchant_name"));--> statement-breakpoint
CREATE INDEX "receipts_transaction_datetime_index" ON "receipts" ("transaction_datetime");--> statement-breakpoint
CREATE INDEX "receipts_created_at_index" ON "receipts" ("created_at");--> statement-breakpoint
CREATE INDEX "receipts_payment_method_index" ON "receipts" ("payment_method");--> statement-breakpoint
ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_receipt_id_receipts_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "receipts"("id") ON DELETE CASCADE;