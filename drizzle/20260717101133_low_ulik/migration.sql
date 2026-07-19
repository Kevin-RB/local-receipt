CREATE TABLE "receipts" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant" jsonb NOT NULL,
	"transaction" jsonb NOT NULL,
	"items" jsonb NOT NULL,
	"totals" jsonb NOT NULL,
	"payment" jsonb NOT NULL,
	"minio_object_key" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"has_integrity_warning" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
