import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { relations } from "@/lib/db/relations";

import { DEFAULT_DATABASE_URL } from "./constants";

export { receipts } from "./schema/receipt";
export type { ProcessingStatus } from "./schema/receipt";
export { receiptItems } from "./schema/receipt-item";

const createDb = (connectionString: string) => {
  const pool = new Pool({
    application_name: "receipt-app",
    connectionString,
    max: 10,
  });
  return drizzle({ client: pool, relations });
};

export type DrizzleDb = ReturnType<typeof createDb>;

const globalForDb = globalThis as unknown as { db?: DrizzleDb };

export const db =
  globalForDb.db ?? createDb(process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL);

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}

export const findReceiptById = (id: string) =>
  db.query.receipts.findFirst({ where: { id } });

export const findReceiptByIdForOwner = (id: string, ownerId: string) =>
  db.query.receipts.findFirst({ where: { id, userId: ownerId } });

export const findReceiptByIdWithItems = (id: string, ownerId: string) =>
  db.query.receipts.findFirst({
    where: { id, userId: ownerId },
    with: { receiptItems: true },
  });

export const findReceiptByObjectKey = (minioObjectKey: string) =>
  db.query.receipts.findFirst({ where: { minioObjectKey } });

export const listReceipts = (ownerId: string) =>
  db.query.receipts.findMany({
    orderBy: (receipts, { desc }) => [desc(receipts.createdAt)],
    where: { userId: ownerId },
    with: {
      receiptItems: true,
    },
  });

export const listDoneReceipts = (ownerId: string) =>
  db.query.receipts.findMany({
    orderBy: (receipts, { desc }) => [desc(receipts.createdAt)],
    where: { status: "done", userId: ownerId },
  });

export { drizzle } from "drizzle-orm/node-postgres";
