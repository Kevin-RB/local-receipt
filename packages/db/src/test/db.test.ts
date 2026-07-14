import { drizzle } from "drizzle-orm/node-postgres";
import { describe, it, expect } from "vitest";

import { createDb, DEFAULT_DATABASE_URL } from "../index.js";

describe("@receipt-app/db boundary", () => {
  it("exports the Drizzle factory and client constructor", () => {
    expect(createDb).toBeTypeOf("function");
    expect(drizzle).toBeTypeOf("function");
  });

  it("can create a client without connecting to a real database", () => {
    const db = createDb(DEFAULT_DATABASE_URL);
    expect(db).toBeDefined();
    expect(db.query).toBeTypeOf("object");
  });
});
