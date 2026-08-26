ALTER TABLE "receipts" ADD COLUMN "user_id" text;--> statement-breakpoint
CREATE INDEX "receipts_user_id_index" ON "receipts" ("user_id");--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id");--> statement-breakpoint
UPDATE "receipts" SET "user_id" = (SELECT "id" FROM "user" WHERE "email" = 'kr38996@gmail.com' LIMIT 1) WHERE "user_id" IS NULL;--> statement-breakpoint
ALTER TABLE "receipts" ALTER COLUMN "user_id" SET NOT NULL;
