import { index, numeric, snakeCase, text, uuid } from "drizzle-orm/pg-core";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-orm/zod";
import { z } from "zod";

import { categories } from "@/lib/db/schema/category";
import { receipts } from "@/lib/db/schema/receipt";

export const lineItemKindEnum = z.enum(["product", "surcharge", "discount"]);

export type LineItemKind = z.infer<typeof lineItemKindEnum>;

export const receiptItems = snakeCase.table(
  "receipt_items",
  {
    categoryId: uuid().references(() => categories.id, {
      onDelete: "set null",
    }),
    id: uuid().primaryKey().defaultRandom(),
    kind: text().$type<LineItemKind>().notNull().default("product"),
    lineTotal: numeric({ mode: "number", precision: 10, scale: 2 }).notNull(),
    name: text().notNull(),
    quantity: numeric({ mode: "number" }),
    receiptId: uuid()
      .notNull()
      .references(() => receipts.id, { onDelete: "cascade" }),
    unitPrice: numeric({ mode: "number", precision: 10, scale: 2 }),
  },
  (table) => [
    index("receipt_items_category_id_index").on(table.categoryId),
    index("receipt_items_receipt_id_index").on(table.receiptId),
  ]
);

export const receiptItemSelectSchema = createSelectSchema(receiptItems, {
  kind: lineItemKindEnum,
});
export const receiptItemInsertSchema = createInsertSchema(receiptItems, {
  kind: lineItemKindEnum.optional(),
});
export const receiptItemUpdateSchema = createUpdateSchema(receiptItems);

export type ReceiptItemSelect = z.infer<typeof receiptItemSelectSchema>;
export type ReceiptItemInsert = z.infer<typeof receiptItemInsertSchema>;
export type ReceiptItemUpdate = z.infer<typeof receiptItemUpdateSchema>;
