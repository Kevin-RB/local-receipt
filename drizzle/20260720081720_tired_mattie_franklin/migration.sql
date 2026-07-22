ALTER TABLE "receipts" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
DROP SEQUENCE "receipts_id_seq";--> statement-breakpoint
ALTER TABLE "receipts" ALTER COLUMN "id" SET DATA TYPE uuid USING "id"::uuid;