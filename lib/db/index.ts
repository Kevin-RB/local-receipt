import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { relations } from "./relations";

export { DEFAULT_DATABASE_URL } from "./constants";
export {
  Merchant,
  Payment,
  ReceiptExtraction,
  ReceiptItem,
  Totals,
  Transaction,
} from "./contract";
export { receipts } from "./schema";
export type { ProcessingStatus } from "./schema";

export const createDb = (connectionString: string) => {
  const pool = new Pool({
    connectionString,
  });
  return drizzle({ client: pool, relations });
};

export type DrizzleDb = ReturnType<typeof createDb>;

export const findReceiptById = (db: DrizzleDb, id: string) =>
  db.query.receipts.findFirst({ where: { id } });

export const listReceipts = (db: DrizzleDb) =>
  db.query.receipts.findMany({
    orderBy: (receipts, { desc }) => [desc(receipts.createdAt)],
  });

export { drizzle } from "drizzle-orm/node-postgres";
