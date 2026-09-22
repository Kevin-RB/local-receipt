import { describe, expect, it } from "vitest";

import { dedupeByHash, fixtureId } from "./fixtures";

describe(fixtureId, () => {
  it("is a stable hash of the image bytes", () => {
    const bytes = new TextEncoder().encode("receipt-image");

    expect(fixtureId(bytes)).toBe(fixtureId(bytes));
    expect(fixtureId(bytes)).toMatch(/^[0-9a-f]{64}$/u);
  });

  it("differs for different bytes", () => {
    expect(fixtureId(new Uint8Array([1, 2, 3]))).not.toBe(
      fixtureId(new Uint8Array([3, 2, 1]))
    );
  });
});

describe(dedupeByHash, () => {
  it("keeps the first of each hash and reports byte-identical duplicates", () => {
    const { duplicates, unique } = dedupeByHash([
      { hash: "a", path: "one.jpg" },
      { hash: "b", path: "two.jpg" },
      { hash: "a", path: "one-copy.jpg" },
      { hash: "a", path: "one-copy-2.jpg" },
    ]);

    expect(unique).toStrictEqual([
      { hash: "a", path: "one.jpg" },
      { hash: "b", path: "two.jpg" },
    ]);
    expect(duplicates).toStrictEqual([
      { hash: "a", path: "one-copy.jpg" },
      { hash: "a", path: "one-copy-2.jpg" },
    ]);
  });
});
