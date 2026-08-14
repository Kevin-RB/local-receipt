import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { receiptItems } from "@/lib/db/schema/receipt-item";

describe("receipt_items snake_case casing", () => {
  it("maps camelCase keys to snake_case columns", () => {
    const config = getTableConfig(receiptItems);
    expect(config.name).toBe("receipt_items");
    expect(config.columns.map((c) => c.name)).toStrictEqual([
      "id",
      "line_total",
      "name",
      "quantity",
      "receipt_id",
      "unit_price",
    ]);
  });
});
