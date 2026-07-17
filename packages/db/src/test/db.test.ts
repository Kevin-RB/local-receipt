import assert from "node:assert";
import { describe, it } from "node:test";
import { createDb, drizzle, DEFAULT_DATABASE_URL } from "../index.js";

describe("@receipt-app/db boundary", () => {
  it("exports the Drizzle factory and client constructor", () => {
    assert.strictEqual(typeof createDb, "function");
    assert.strictEqual(typeof drizzle, "function");
  });

  it("can create a client without connecting to a real database", () => {
    const db = createDb(DEFAULT_DATABASE_URL);
    assert.ok(db);
    assert.strictEqual(typeof db.query, "object");
  });
});
