import { describe, expect, it } from "vitest";

import { filterFn_fuzzy } from "@/components/receipts/features";

const makeRow = (value: unknown) => ({ getValue: () => value }) as never;

describe(filterFn_fuzzy, () => {
  it("matches case-insensitive substrings", () => {
    expect(
      filterFn_fuzzy(makeRow("Coles Supermarket"), "merchantName", "coles")
    ).toBeTruthy();
  });

  it("matches subsequence characters in order", () => {
    expect(
      filterFn_fuzzy(makeRow("Woolworths"), "merchantName", "wools")
    ).toBeTruthy();
  });

  it("rejects characters out of order", () => {
    expect(
      filterFn_fuzzy(makeRow("Woolworths"), "merchantName", "sw")
    ).toBeFalsy();
  });

  it("auto-removes empty filter values", () => {
    expect(filterFn_fuzzy.autoRemove?.("")).toBeTruthy();
    expect(filterFn_fuzzy.autoRemove?.("a")).toBeFalsy();
  });
});
