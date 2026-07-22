ALTER TABLE "receipts" ALTER COLUMN "items" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "receipts" ALTER COLUMN "merchant" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "receipts" ALTER COLUMN "payment" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "receipts" ALTER COLUMN "totals" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "receipts" ALTER COLUMN "transaction" DROP NOT NULL;