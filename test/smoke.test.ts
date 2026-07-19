import { describe, it, expect } from "vitest";

import { createDb, drizzle } from "@/lib/db";

describe("app smoke test", () => {
  it("can import the db boundary", () => {
    expect(createDb).toBeTypeOf("function");
    expect(drizzle).toBeTypeOf("function");
  });

  it("page component exports a default function", async () => {
    const page = await import("../app/page.js");
    expect(page.default).toBeTypeOf("function");
  });
});
