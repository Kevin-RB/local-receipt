import { describe, expect, it } from "vitest";

import {
  lineItemSearchSchema,
  receiptDetailSchema,
  receiptSummariesSchema,
} from "./output-schemas";

/**
 * Tool outputs cross the wire as JSON. These schemas are the contract the AI
 * SDK validates the client's copy against, so they double as the check that a
 * query's real result actually survives serialisation.
 */
describe("tool output schemas", () => {
  it("accepts a receipt summary list as it comes off the wire", () => {
    const parsed = receiptSummariesSchema.parse([
      {
        date: "2026-08-25",
        hasIntegrityWarning: false,
        id: "8b1c2a44-0f5e-4a1b-9c3d-2e6f7a8b9c0d",
        merchant: "Woolworths",
        total: 42.5,
      },
      {
        date: null,
        hasIntegrityWarning: true,
        id: "1a2b3c4d-5e6f-4a8b-9c0d-1e2f3a4b5c6d",
        merchant: null,
        total: null,
      },
    ]);

    expect(parsed).toHaveLength(2);
  });

  it("rejects a date that is not receipt-local ISO", () => {
    const result = receiptSummariesSchema.safeParse([
      {
        date: "2026-08-25T00:00:00.000Z",
        hasIntegrityWarning: false,
        id: "8b1c2a44-0f5e-4a1b-9c3d-2e6f7a8b9c0d",
        merchant: "Woolworths",
        total: 42.5,
      },
    ]);

    expect(result.success).toBeFalsy();
  });

  it("rejects a Date, which JSON would have turned into a string anyway", () => {
    // A `Date` in a tool result is the bug this guards: it would serialise to
    // an ISO instant, silently disagree with the receipt-local date every
    // other field carries, and render as the wrong day.
    const result = lineItemSearchSchema.safeParse({
      count: 1,
      items: [
        {
          category: "Dairy > Cheese",
          date: new Date("2026-08-25T00:00:00.000Z"),
          item: "BRICK 250G",
          kind: "product",
          lineTotal: 4.5,
          merchant: "Coles",
          receiptId: "8b1c2a44-0f5e-4a1b-9c3d-2e6f7a8b9c0d",
        },
      ],
      total: 4.5,
    });

    expect(result.success).toBeFalsy();
  });

  it("accepts a line item search as it comes off the wire", () => {
    const search = {
      count: 1,
      items: [
        {
          category: "Dairy > Cheese",
          date: "2026-08-25",
          item: "BRICK 250G",
          kind: "product",
          lineTotal: 4.5,
          merchant: "Coles",
          receiptId: "8b1c2a44-0f5e-4a1b-9c3d-2e6f7a8b9c0d",
        },
      ],
      total: 4.5,
    };

    expect(lineItemSearchSchema.parse(search)).toStrictEqual(search);
  });

  it("accepts a null receipt detail for a missing receipt", () => {
    expect(receiptDetailSchema.nullable().parse(null)).toBeNull();
  });
});
