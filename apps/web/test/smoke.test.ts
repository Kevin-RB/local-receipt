import assert from "node:assert";
import { describe, it } from "node:test";

describe("@receipt-app/web workspace smoke test", () => {
  it("can import the shared db boundary", async () => {
    const db = await import("@receipt-app/db");
    assert.strictEqual(typeof db.createDb, "function");
    assert.strictEqual(typeof db.drizzle, "function");
  });

  it("page component exports a default function", async () => {
    // tsx resolves the .js specifier to the .tsx source file at test time.
    const page = await import("../app/page.js");
    assert.strictEqual(typeof page.default, "function");
  });
});
