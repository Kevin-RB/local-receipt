import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

export { DEFAULT_DATABASE_URL } from "./constants.js";

/**
 * Create a Drizzle client backed by node-postgres.
 * Schema is added in a later slice; this function just wires the boundary.
 */
export const createDb = function createDb(connectionString: string) {
  const pool = new Pool({ connectionString });
  return drizzle(pool);
};

export { drizzle } from "drizzle-orm/node-postgres";
