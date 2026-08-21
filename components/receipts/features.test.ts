import { describe, expect, it } from "vitest";

import { fuzzyFilter, fuzzySort } from "@/lib/fuzzy-filter";

const makeRow = (value: unknown) =>
  ({
    columnFiltersMeta: {},
    getValue: () => value,
  }) as never;

describe(fuzzyFilter, () => {
  it("matches case-insensitive substrings", () => {
    expect(
      fuzzyFilter(makeRow("Coles Supermarket"), "merchantName", "coles")
    ).toBeTruthy();
  });

  it("stores ranking info via addMeta", () => {
    let meta: { itemRank?: { passed?: boolean; rank?: number } } | undefined;
    const passed = fuzzyFilter(
      makeRow("Woolworths"),
      "merchantName",
      "wools",
      (m) => {
        meta = m;
      }
    );
    expect(passed).toBeTruthy();
    expect(meta?.itemRank?.passed).toBeTruthy();
  });

  it("rejects non-matches", () => {
    expect(
      fuzzyFilter(makeRow("Woolworths"), "merchantName", "xyzzy")
    ).toBeFalsy();
  });
});

describe(fuzzySort, () => {
  it("falls back to alphanumeric when no rank info exists", () => {
    const a = makeRow("ALDI");
    const b = makeRow("Coles");
    expect(fuzzySort(a, b, "merchantName")).toBeLessThanOrEqual(0);
  });
});
