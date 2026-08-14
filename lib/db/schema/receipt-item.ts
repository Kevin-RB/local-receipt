import { numeric, snakeCase, text, uuid } from "drizzle-orm/pg-core";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-orm/zod";
import type z from "zod";

import { receipts } from "@/lib/db/schema/receipt";

export const receiptItems = snakeCase.table("receipt_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  lineTotal: numeric("line_total", {
    mode: "number",
    precision: 10,
    scale: 2,
  }).notNull(),
  name: text("name").notNull(),
  quantity: numeric("quantity", { mode: "number" }),
  receiptId: uuid("receipt_id")
    .notNull()
    .references(() => receipts.id, { onDelete: "cascade" }),
  unitPrice: numeric("unit_price", { mode: "number", precision: 10, scale: 2 }),
});

export const receiptItemSelectSchema = createSelectSchema(receiptItems);
export const receiptItemInsertSchema = createInsertSchema(receiptItems);
export const receiptItemUpdateSchema = createUpdateSchema(receiptItems);

export type ReceiptItemSelect = z.infer<typeof receiptItemSelectSchema>;
export type ReceiptItemInsert = z.infer<typeof receiptItemInsertSchema>;
export type ReceiptItemUpdate = z.infer<typeof receiptItemUpdateSchema>;
