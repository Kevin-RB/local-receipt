CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"parent_id" uuid,
	"slug" text NOT NULL UNIQUE
);
--> statement-breakpoint
ALTER TABLE "receipt_items" ADD COLUMN "category_id" uuid;--> statement-breakpoint
ALTER TABLE "receipts" ADD COLUMN "categorized_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "categories_parent_id_index" ON "categories" ("parent_id");--> statement-breakpoint
CREATE INDEX "receipt_items_category_id_index" ON "receipt_items" ("category_id");--> statement-breakpoint
CREATE INDEX "receipt_items_receipt_id_index" ON "receipt_items" ("receipt_id");--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_category_id_categories_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL;--> statement-breakpoint
INSERT INTO "categories" ("name", "slug") VALUES
	('Groceries', 'groceries'),
	('Dining & Takeaway', 'dining-takeaway'),
	('Alcohol', 'alcohol'),
	('Fuel & Transport', 'fuel-transport'),
	('Health', 'health'),
	('Household & Hardware', 'household-hardware'),
	('Clothing & Footwear', 'clothing-footwear'),
	('Electronics & Tech', 'electronics-tech'),
	('Entertainment', 'entertainment'),
	('Fees & Charges', 'fees-charges'),
	('Discounts', 'discounts'),
	('Other', 'other');--> statement-breakpoint
INSERT INTO "categories" ("name", "slug", "parent_id") VALUES
	('Produce', 'produce', (SELECT "id" FROM "categories" WHERE "slug" = 'groceries')),
	('Dairy & Eggs', 'dairy-eggs', (SELECT "id" FROM "categories" WHERE "slug" = 'groceries')),
	('Meat & Seafood', 'meat-seafood', (SELECT "id" FROM "categories" WHERE "slug" = 'groceries')),
	('Bakery', 'bakery', (SELECT "id" FROM "categories" WHERE "slug" = 'groceries')),
	('Pantry', 'pantry', (SELECT "id" FROM "categories" WHERE "slug" = 'groceries')),
	('Frozen', 'frozen', (SELECT "id" FROM "categories" WHERE "slug" = 'groceries')),
	('Snacks', 'snacks', (SELECT "id" FROM "categories" WHERE "slug" = 'groceries')),
	('Drinks', 'drinks', (SELECT "id" FROM "categories" WHERE "slug" = 'groceries')),
	('Household', 'household', (SELECT "id" FROM "categories" WHERE "slug" = 'groceries')),
	('Health & Beauty', 'health-beauty', (SELECT "id" FROM "categories" WHERE "slug" = 'groceries')),
	('Restaurant', 'restaurant', (SELECT "id" FROM "categories" WHERE "slug" = 'dining-takeaway')),
	('Cafe', 'cafe', (SELECT "id" FROM "categories" WHERE "slug" = 'dining-takeaway')),
	('Fast Food', 'fast-food', (SELECT "id" FROM "categories" WHERE "slug" = 'dining-takeaway')),
	('Beer & Wine', 'beer-wine', (SELECT "id" FROM "categories" WHERE "slug" = 'alcohol')),
	('Spirits', 'spirits', (SELECT "id" FROM "categories" WHERE "slug" = 'alcohol')),
	('Fuel', 'fuel', (SELECT "id" FROM "categories" WHERE "slug" = 'fuel-transport')),
	('Public Transport', 'public-transport', (SELECT "id" FROM "categories" WHERE "slug" = 'fuel-transport')),
	('Parking & Tolls', 'parking-tolls', (SELECT "id" FROM "categories" WHERE "slug" = 'fuel-transport')),
	('Rideshare', 'rideshare', (SELECT "id" FROM "categories" WHERE "slug" = 'fuel-transport')),
	('Pharmacy', 'pharmacy', (SELECT "id" FROM "categories" WHERE "slug" = 'health')),
	('Medical & Dental', 'medical-dental', (SELECT "id" FROM "categories" WHERE "slug" = 'health')),
	('Fitness', 'fitness', (SELECT "id" FROM "categories" WHERE "slug" = 'health')),
	('Homewares', 'homewares', (SELECT "id" FROM "categories" WHERE "slug" = 'household-hardware')),
	('Garden', 'garden', (SELECT "id" FROM "categories" WHERE "slug" = 'household-hardware')),
	('Tools', 'tools', (SELECT "id" FROM "categories" WHERE "slug" = 'household-hardware')),
	('Streaming', 'streaming', (SELECT "id" FROM "categories" WHERE "slug" = 'entertainment')),
	('Events', 'events', (SELECT "id" FROM "categories" WHERE "slug" = 'entertainment')),
	('Hobbies', 'hobbies', (SELECT "id" FROM "categories" WHERE "slug" = 'entertainment')),
	('Card Surcharge', 'card-surcharge', (SELECT "id" FROM "categories" WHERE "slug" = 'fees-charges')),
	('Service Fee', 'service-fee', (SELECT "id" FROM "categories" WHERE "slug" = 'fees-charges')),
	('Store Discount', 'store-discount', (SELECT "id" FROM "categories" WHERE "slug" = 'discounts')),
	('Loyalty Discount', 'loyalty-discount', (SELECT "id" FROM "categories" WHERE "slug" = 'discounts'));