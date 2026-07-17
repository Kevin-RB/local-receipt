import {
  boolean,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import type {
  Merchant,
  Payment,
  ReceiptItem,
  Totals,
  Transaction,
} from "./contract.js";

export type ProcessingStatus = "pending" | "processing" | "done" | "error";

export const receipts = pgTable("receipts", {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  hasIntegrityWarning: boolean("has_integrity_warning")
    .notNull()
    .default(false),
  id: serial("id").primaryKey(),
  items: jsonb("items").$type<ReceiptItem[]>().notNull(),
  merchant: jsonb("merchant").$type<Merchant>().notNull(),
  minioObjectKey: text("minio_object_key"),
  payment: jsonb("payment").$type<Payment>().notNull(),
  status: text("status").$type<ProcessingStatus>().notNull().default("pending"),
  totals: jsonb("totals").$type<Totals>().notNull(),
  transaction: jsonb("transaction").$type<Transaction>().notNull(),
});
