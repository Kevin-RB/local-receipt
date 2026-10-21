import { describe, expect, it } from "vitest";

import type { LineItemKind } from "@/lib/db/schema/receipt-item";

import { planLineItemChanges } from "./line-items";

// The form only claims a category was touched in the tests that are about a
// category decision; the default mirrors a user who opened the page and edited
// something else.
const item = (
  overrides: Partial<Parameters<typeof planLineItemChanges>[1][number]> = {}
) => ({
  categoryId: null,
  categoryTouched: false,
  kind: "product" as LineItemKind,
  lineTotal: 10,
  name: "Milk",
  quantity: 1,
  unitPrice: 10,
  ...overrides,
});

const stored = (overrides = {}) => ({
  categoryId: null,
  categorySource: "ai" as const,
  id: "item-1",
  ...overrides,
});

describe(planLineItemChanges, () => {
  it("updates the fields of a stored item the user kept", () => {
    const plan = planLineItemChanges(
      [stored()],
      [item({ itemId: "item-1", name: "Whole Milk" })]
    );

    expect(plan).toStrictEqual({
      inserts: [],
      removals: [],
      updates: [
        {
          id: "item-1",
          values: {
            kind: "product",
            lineTotal: 10,
            name: "Whole Milk",
            quantity: 1,
            unitPrice: 10,
          },
        },
      ],
    });
  });

  it("inserts a submitted item that is not stored yet", () => {
    const plan = planLineItemChanges([], [item({ itemId: undefined })]);

    expect(plan).toStrictEqual({
      inserts: [
        {
          categoryId: null,
          categorySource: "ai",
          kind: "product",
          lineTotal: 10,
          name: "Milk",
          quantity: 1,
          unitPrice: 10,
        },
      ],
      removals: [],
      updates: [],
    });
  });

  it("removes stored items the user deleted", () => {
    const plan = planLineItemChanges(
      [stored(), stored({ id: "item-2" })],
      [item({ itemId: "item-1" })]
    );

    expect(plan.removals).toStrictEqual(["item-2"]);
    expect(plan.updates).toHaveLength(1);
    expect(plan.inserts).toStrictEqual([]);
  });

  it("marks a changed category as user-set so a re-run preserves it", () => {
    const plan = planLineItemChanges(
      [stored({ categoryId: "cat-dairy", categorySource: "ai" })],
      [
        item({
          categoryId: "cat-bakery",
          categoryTouched: true,
          itemId: "item-1",
        }),
      ]
    );

    expect(plan.updates[0].values).toMatchObject({
      categoryId: "cat-bakery",
      categorySource: "user",
    });
  });

  it("keeps the ai marker when the user re-saves an unchanged ai category", () => {
    const plan = planLineItemChanges(
      [stored({ categoryId: "cat-dairy", categorySource: "ai" })],
      [
        item({
          categoryId: "cat-dairy",
          categoryTouched: true,
          itemId: "item-1",
        }),
      ]
    );

    expect(plan.updates[0].values).toMatchObject({
      categoryId: "cat-dairy",
      categorySource: "ai",
    });
  });

  it("records clearing a category as a user decision", () => {
    const plan = planLineItemChanges(
      [stored({ categoryId: "cat-dairy", categorySource: "user" })],
      [item({ categoryId: null, categoryTouched: true, itemId: "item-1" })]
    );

    expect(plan.updates[0].values).toMatchObject({
      categoryId: null,
      categorySource: "user",
    });
  });

  it("leaves the stored category alone when the user did not touch it", () => {
    // Categorization can fill an item after the edit form loaded. The submitted
    // value is then stale (null) while the stored value is not (cat-a), and
    // treating that difference as a user decision would record a permanent
    // clear — the exact clobber a category_source marker exists to prevent.
    const plan = planLineItemChanges(
      [stored({ categoryId: "cat-a", categorySource: "ai" })],
      [item({ categoryId: null, categoryTouched: false, itemId: "item-1" })]
    );

    expect(plan.updates[0].values).not.toHaveProperty("categoryId");
    expect(plan.updates[0].values).not.toHaveProperty("categorySource");
    expect(plan.updates[0].values).toMatchObject({ name: "Milk" });
  });

  it("keeps a user-set category when the user edits other fields", () => {
    const plan = planLineItemChanges(
      [stored({ categoryId: "cat-a", categorySource: "user" })],
      [
        item({
          categoryId: "cat-a",
          categoryTouched: false,
          itemId: "item-1",
          name: "Milk 2L",
        }),
      ]
    );

    expect(plan.updates[0].values).not.toHaveProperty("categoryId");
    expect(plan.updates[0].values).not.toHaveProperty("categorySource");
  });

  it("still records a clear as a user decision when the field was touched", () => {
    const plan = planLineItemChanges(
      [stored({ categoryId: "cat-a", categorySource: "ai" })],
      [item({ categoryId: null, categoryTouched: true, itemId: "item-1" })]
    );

    expect(plan.updates[0].values).toMatchObject({
      categoryId: null,
      categorySource: "user",
    });
  });

  it("does not treat an item id from another receipt as an update", () => {
    const plan = planLineItemChanges(
      [stored()],
      [item({ itemId: "someone-elses-item" })]
    );

    expect(plan.updates).toStrictEqual([]);
    expect(plan.inserts).toHaveLength(1);
  });
});
