import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { index, snakeCase, text, uuid } from "drizzle-orm/pg-core";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-orm/zod";
import type { z } from "zod";

export const categories = snakeCase.table(
  "categories",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    parentId: uuid().references((): AnyPgColumn => categories.id, {
      onDelete: "restrict",
    }),
    slug: text().notNull().unique(),
  },
  (table) => [index("categories_parent_id_index").on(table.parentId)]
);

export const categorySelectSchema = createSelectSchema(categories);
export const categoryInsertSchema = createInsertSchema(categories);
export const categoryUpdateSchema = createUpdateSchema(categories);

export type CategorySelect = z.infer<typeof categorySelectSchema>;
export type CategoryInsert = z.infer<typeof categoryInsertSchema>;
export type CategoryUpdate = z.infer<typeof categoryUpdateSchema>;
