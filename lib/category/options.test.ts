import { describe, expect, it } from "vitest";

import {
  flattenCategoryOptions,
  groupCategoryOptions,
  UNCATEGORISED_CATEGORY,
  UNCATEGORISED_LABEL,
} from "./options";

const option = (overrides = {}) => ({
  id: "id-1",
  name: "Dairy & Eggs",
  parentName: "Groceries" as string | null,
  slug: "dairy-eggs",
  ...overrides,
});

describe(groupCategoryOptions, () => {
  it("groups leaf categories under their top-level category", () => {
    const groups = groupCategoryOptions([
      option({ id: "dairy", name: "Dairy & Eggs" }),
      option({ id: "bakery", name: "Bakery" }),
    ]);

    expect(groups).toStrictEqual([
      {
        label: "Groceries",
        options: [
          { label: "Dairy & Eggs", value: "dairy" },
          { label: "Bakery", value: "bakery" },
        ],
      },
    ]);
  });

  it("collects leaf categories that have no parent into their own group", () => {
    const groups = groupCategoryOptions([
      option({ id: "other", name: "Other", parentName: null, slug: "other" }),
    ]);

    expect(groups).toStrictEqual([
      {
        label: UNCATEGORISED_LABEL,
        options: [{ label: "Other", value: "other" }],
      },
    ]);
  });

  it("sorts the groups by label", () => {
    const groups = groupCategoryOptions([
      option({ id: "dairy", parentName: "Groceries" }),
      option({ id: "cafe", name: "Cafe", parentName: "Dining & Takeaway" }),
    ]);

    expect(groups.map((group) => group.label)).toStrictEqual([
      "Dining & Takeaway",
      "Groceries",
    ]);
  });

  it("returns no groups for an empty taxonomy", () => {
    expect(groupCategoryOptions([])).toStrictEqual([]);
  });
});

describe(flattenCategoryOptions, () => {
  it("lists every option in group order so the trigger can name the value", () => {
    const flat = flattenCategoryOptions([
      { label: "Alcohol", options: [{ label: "Beer & Wine", value: "beer" }] },
      { label: "Groceries", options: [{ label: "Bakery", value: "bakery" }] },
    ]);

    expect(flat).toStrictEqual([
      { label: "Beer & Wine", value: "beer" },
      { label: "Bakery", value: "bakery" },
    ]);
  });

  it("carries no group labels, since the trigger shows one name", () => {
    const flat = flattenCategoryOptions(
      groupCategoryOptions([option({ id: "dairy", name: "Dairy & Eggs" })])
    );

    expect(flat).toStrictEqual([{ label: "Dairy & Eggs", value: "dairy" }]);
  });

  it("returns nothing for an empty taxonomy", () => {
    expect(flattenCategoryOptions([])).toStrictEqual([]);
  });
});

describe(UNCATEGORISED_CATEGORY, () => {
  it("is a sentinel that no real category id can collide with", () => {
    expect(UNCATEGORISED_CATEGORY).not.toMatch(
      // A uuid, which is what the column stores.
      /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu
    );
  });
});
