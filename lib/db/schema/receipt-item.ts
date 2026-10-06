import { sql } from "drizzle-orm";
import {
  check,
  index,
  numeric,
  snakeCase,
  text,
  uuid,
} from "drizzle-orm/pg-core";
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

export const categorySourceEnum = z.enum(["ai", "user"]);

export type CategorySource = z.infer<typeof categorySourceEnum>;

export const receiptItems = snakeCase.table(
  "receipt_items",
  {
    categoryId: uuid().references(() => categories.id, {
      onDelete: "set null",
    }),
    categorySource: text().$type<CategorySource>().notNull().default("ai"),
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
    // ADR-0007: a discount removes from the total, so its line total may never
    // be positive. Zero is allowed because a discount of nothing is harmless
    // and `normalizeLineItems` leaves it alone. The constraint is the last line
    // of defence — the coercion in `lib/receipt/line-item-money` is what the app
    // actually relies on, since a rejected write would surface as a save error
    // rather than a corrected value.
    check(
      "receipt_items_discount_is_not_positive",
      sql`${table.kind} <> 'discount' OR ${table.lineTotal} <= 0`
    ),
  ]
);

export const receiptItemSelectSchema = createSelectSchema(receiptItems, {
  categorySource: categorySourceEnum,
  kind: lineItemKindEnum,
});
export const receiptItemInsertSchema = createInsertSchema(receiptItems, {
  categorySource: categorySourceEnum.optional(),
  kind: lineItemKindEnum.optional(),
});
export const receiptItemUpdateSchema = createUpdateSchema(receiptItems);

export type ReceiptItemSelect = z.infer<typeof receiptItemSelectSchema>;
export type ReceiptItemInsert = z.infer<typeof receiptItemInsertSchema>;
export type ReceiptItemUpdate = z.infer<typeof receiptItemUpdateSchema>;
