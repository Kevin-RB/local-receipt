import { numeric, pgTable, text, uuid } from "drizzle-orm/pg-core";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-orm/zod";

import { receipts } from "@/lib/db/schema/receipt";

export const receiptItems = pgTable("receipt_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  lineTotal: numeric("line_total", { precision: 10, scale: 2 }).notNull(),
  name: text("name").notNull(),
  quantity: numeric("quantity"),
  receiptId: uuid("receipt_id")
    .notNull()
    .references(() => receipts.id, { onDelete: "cascade" }),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }),
});

export const receiptItemSelectSchema = createSelectSchema(receiptItems);
export const receiptItemInsertSchema = createInsertSchema(receiptItems);
export const receiptItemUpdateSchema = createUpdateSchema(receiptItems);
