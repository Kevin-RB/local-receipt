import { describe, it, expect } from "vitest";

import { db } from "@/lib/db";

describe("app smoke test", () => {
  it("can import the db boundary", () => {
    expect(db).toBeDefined();
    expect(db.query).toBeTypeOf("object");
  });

  it("page component exports a default function", async () => {
    const page = await import("../app/(app)/page.js");
    expect(page.default).toBeTypeOf("function");
  });
});
