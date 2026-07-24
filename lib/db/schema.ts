import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import type {
  Merchant,
  Payment,
  ReceiptItem,
  Totals,
  Transaction,
} from "./contract";

export type ProcessingStatus =
  | "uploading"
  | "pending"
  | "processing"
  | "done"
  | "error";

export const receipts = pgTable("receipts", {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  hasIntegrityWarning: boolean("has_integrity_warning")
    .notNull()
    .default(false),
  id: uuid("id").primaryKey(),
  items: jsonb("items").$type<ReceiptItem[]>(),
  merchant: jsonb("merchant").$type<Merchant>(),
  minioObjectKey: text("minio_object_key"),
  payment: jsonb("payment").$type<Payment>(),
  status: text("status").$type<ProcessingStatus>().notNull().default("pending"),
  totals: jsonb("totals").$type<Totals>(),
  transaction: jsonb("transaction").$type<Transaction>(),
});
