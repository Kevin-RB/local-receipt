import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema.js";

export { DEFAULT_DATABASE_URL } from "./constants.js";
export { receiptExtractionJsonSchema } from "./contract.js";
export type {
  Merchant,
  Payment,
  ReceiptExtraction,
  ReceiptItem,
  Totals,
  Transaction,
} from "./contract.js";
export { receipts } from "./schema.js";
export type { ProcessingStatus } from "./schema.js";

export const createDb = (connectionString: string) => {
  const pool = new Pool({ connectionString });
  return drizzle(pool, { schema });
};

export type DrizzleDb = ReturnType<typeof createDb>;

export const findReceiptById = (db: DrizzleDb, id: number) =>
  db.query.receipts.findFirst({ where: eq(schema.receipts.id, id) });

export const listReceipts = (db: DrizzleDb) =>
  db.query.receipts.findMany({
    orderBy: (receipts, { desc }) => [desc(receipts.createdAt)],
  });

export { drizzle } from "drizzle-orm/node-postgres";
