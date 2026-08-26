import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  numeric,
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

import { user } from "@/lib/db/schema/auth";

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

export const paymentMethodEnum = z.enum(["cash", "card", "other"]);
export type PaymentMethod = z.infer<typeof paymentMethodEnum>;

export const Payment = z.strictObject({
  method: paymentMethodEnum.default("other"),
});
export type Payment = z.infer<typeof Payment>;

export const receipts = snakeCase.table(
  "receipts",
  {
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    gst: numeric({ mode: "number", precision: 10, scale: 2 }),
    hasIntegrityWarning: boolean().notNull().default(false),
    id: uuid().primaryKey().defaultRandom(),
    merchantAbn: text(),
    merchantAddress: text(),
    merchantName: text(),
    merchantStoreId: text(),
    minioObjectKey: text(),
    paymentMethod: text().$type<PaymentMethod>(),
    receiptNumber: text(),
    status: text().$type<ProcessingStatus>().notNull().default("pending"),
    subtotal: numeric({ mode: "number", precision: 10, scale: 2 }),
    total: numeric({ mode: "number", precision: 10, scale: 2 }),
    transactionDateTime: timestamp("transaction_datetime", {
      mode: "date",
      withTimezone: true,
    }),
    userId: text()
      .notNull()
      .references(() => user.id),
  },
  (table) => [
    index("receipts_merchant_name_lower_idx").using(
      "btree",
      sql`lower(${table.merchantName})`
    ),
    index("receipts_transaction_datetime_index").on(table.transactionDateTime),
    index("receipts_created_at_index").on(table.createdAt),
    index("receipts_payment_method_index").on(table.paymentMethod),
    index("receipts_user_id_index").on(table.userId),
  ]
);

export const receiptSelectSchema = createSelectSchema(receipts);
export const receiptInsertSchema = createInsertSchema(receipts, {
  paymentMethod: paymentMethodEnum.nullable().optional(),
  status: processingStatusEnum.optional(),
});
export const receiptUpdateSchema = createUpdateSchema(receipts);

export type ReceiptSelect = z.infer<typeof receiptSelectSchema>;
export type ReceiptInsert = z.infer<typeof receiptInsertSchema>;
export type ReceiptUpdate = z.infer<typeof receiptUpdateSchema>;

export const receiptNestedSchema = z.object({
  merchant: Merchant,
  payment: Payment,
  totals: Totals,
  transaction: Transaction,
});
export type ReceiptNested = z.infer<typeof receiptNestedSchema>;
