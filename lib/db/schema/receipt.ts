import {
  boolean,
  jsonb,
  snakeCase,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-orm/zod";
import { z } from "zod";

export const processingStatusEnum = z.enum([
  "uploading",
  "pending",
  "processing",
  "done",
  "error",
]);

export type ProcessingStatus = z.infer<typeof processingStatusEnum>;

export const Merchant = z.strictObject({
  abn: z.string().optional(),
  address: z.string().optional(),
  name: z.string(),
  storeId: z.string().optional(),
});
export type Merchant = z.infer<typeof Merchant>;

export const Transaction = z.strictObject({
  datetime: z.string().optional(),
  receiptNumber: z.string().optional(),
});
export type Transaction = z.infer<typeof Transaction>;

export const Totals = z.strictObject({
  gst: z.number().optional(),
  subtotal: z.number().optional(),
  total: z.number(),
});
export type Totals = z.infer<typeof Totals>;

export const Payment = z.strictObject({
  method: z.string().optional(),
});
export type Payment = z.infer<typeof Payment>;

export const receipts = snakeCase.table("receipts", {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  hasIntegrityWarning: boolean("has_integrity_warning")
    .notNull()
    .default(false),
  id: uuid("id").primaryKey().defaultRandom(),
  merchant: jsonb("merchant").$type<Merchant>(),
  merchantName: text("merchant_name"),
  minioObjectKey: text("minio_object_key"),
  payment: jsonb("payment").$type<Payment>(),
  receiptNumber: text("receipt_number"),
  status: text("status").$type<ProcessingStatus>().notNull().default("pending"),
  totals: jsonb("totals").$type<Totals>(),
  transaction: jsonb("transaction").$type<Transaction>(),
  transactionDateTime: timestamp("transaction_datetime", {
    mode: "date",
    withTimezone: true,
  }),
});

export const receiptSelectSchema = createSelectSchema(receipts, {
  merchant: Merchant.nullable(),
  payment: Payment.nullable(),
  totals: Totals.nullable(),
  transaction: Transaction.nullable(),
});
export const receiptInsertSchema = createInsertSchema(receipts);
export const receiptUpdateSchema = createUpdateSchema(receipts);

export type ReceiptSelect = z.infer<typeof receiptSelectSchema>;

export const receiptExtractionInsertSchema = receiptInsertSchema
  .pick({
    merchant: true,
    payment: true,
    totals: true,
    transaction: true,
  })
  .extend({
    merchant: Merchant,
    payment: Payment,
    totals: Totals,
    transaction: Transaction,
  });

export type ReceiptExtractionInsert = z.infer<
  typeof receiptExtractionInsertSchema
>;
