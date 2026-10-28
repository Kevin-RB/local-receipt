import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as dbModule from "@/lib/db";

import {
  searchLineItems,
  startOfNextReceiptDay,
  startOfReceiptDay,
} from "./queries";

const mocks = vi.hoisted(() => {
  const queue: unknown[][] = [];
  const builder: Record<string, unknown> = {};

  // The search issues two chainable selects: exact first, fuzzy second. The
  // fake ends at `limit`, which is where the real query is awaited.
  for (const method of ["from", "innerJoin", "leftJoin", "orderBy", "where"]) {
    builder[method] = () => builder;
  }
  builder.limit = () => Promise.resolve(queue.shift() ?? []);

  return {
    queue,
    select: vi.fn<() => Record<string, unknown>>(() => builder),
  };
});

vi.mock(import("@/lib/db"), async (importOriginal) => {
  const actual = await importOriginal<typeof dbModule>();
  return {
    ...actual,
    db: { select: mocks.select } as unknown as dbModule.DrizzleDb,
  };
});

const DAY_MS = 24 * 60 * 60 * 1000;

const row = (overrides: Record<string, unknown> = {}) => ({
  category: "dairy-eggs",
  date: new Date("2026-05-17T04:00:00Z"),
  item: "Greek Yoghurt 1kg",
  kind: "product",
  lineTotal: 6.5,
  merchant: "Woolworths",
  receiptId: "receipt-1",
  ...overrides,
});

describe("receipt day bounds", () => {
  it("returns local midnight and the next local midnight", () => {
    const start = startOfReceiptDay("2026-08-25");
    const end = startOfNextReceiptDay("2026-08-25");

    // Australia/Brisbane is UTC+10 year-round (no daylight saving).
    expect(start.toISOString()).toBe("2026-08-24T14:00:00.000Z");
    expect(end.getTime() - start.getTime()).toBe(DAY_MS);
  });

  it("spans across a month boundary", () => {
    const start = startOfReceiptDay("2026-08-31");
    const end = startOfNextReceiptDay("2026-08-31");

    expect(end.toISOString()).toBe("2026-08-31T14:00:00.000Z");
    expect(end.getTime() - start.getTime()).toBe(DAY_MS);
  });
});

describe(searchLineItems, () => {
  beforeEach(() => {
    mocks.queue.length = 0;
    mocks.select.mockClear();
  });

  it("returns literal matches without running the fuzzy fallback", async () => {
    mocks.queue.push([row()]);

    const result = await searchLineItems("owner-1", { query: "milk" });

    expect(result.items).toStrictEqual([
      {
        category: "dairy-eggs",
        date: "2026-05-17",
        dateLabel: "Sunday, 17 May 2026",
        item: "Greek Yoghurt 1kg",
        kind: "product",
        lineTotal: 6.5,
        merchant: "Woolworths",
        receiptId: "receipt-1",
      },
    ]);
    expect(mocks.select).toHaveBeenCalledOnce();
  });

  it("falls back to fuzzy matches when the literal search is empty", async () => {
    mocks.queue.push([], [row()]);

    const result = await searchLineItems("owner-1", { query: "yogurt" });

    expect(result.items.map((item) => item.item)).toStrictEqual([
      "Greek Yoghurt 1kg",
    ]);
    expect(mocks.select).toHaveBeenCalledTimes(2);
  });

  it("sums only product rows in the returned matches", async () => {
    mocks.queue.push([
      row({ kind: "product", lineTotal: 6.5 }),
      row({ item: "Card Surcharge", kind: "surcharge", lineTotal: 0.1 }),
    ]);

    const result = await searchLineItems("owner-1", { query: "milk" });

    expect(result.count).toBe(2);
    expect(result.total).toBe(6.5);
  });
});
