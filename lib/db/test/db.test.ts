import { describe, it, expect } from "vitest";

import { db } from "../index";

describe("db boundary", () => {
  it("exports a db instance", () => {
    expect(db).toBeDefined();
    expect(db.query).toBeTypeOf("object");
  });

  it("db instance has receipts table", () => {
    expect(db.query.receipts).toBeDefined();
  });
});
