import { describe, it, expect } from "vitest";

describe("@receipt-app/web workspace smoke test", () => {
  it("can import the shared db boundary", async () => {
    const db = await import("@receipt-app/db");

    expect(db.createDb).toBeTypeOf("function");
    expect(db.drizzle).toBeTypeOf("function");
  });

  it("page component exports a default function", async () => {
    // tsx resolves the .js specifier to the .tsx source file at test time.
    const page = await import("../app/page.js");
    expect(page.default).toBeTypeOf("function");
  });
});
