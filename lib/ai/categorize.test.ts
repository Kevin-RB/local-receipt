import { NoObjectGeneratedError } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";

import { categorizeItems } from "./categorize";

const options = [
  { name: "Dairy & Eggs", parentName: "Groceries", slug: "dairy-eggs" },
  { name: "Produce", parentName: "Groceries", slug: "produce" },
  { name: "Other", parentName: null, slug: "other" },
];

const mockResult = (payload: unknown) => ({
  content: [{ text: JSON.stringify(payload), type: "text" as const }],
  finishReason: { raw: undefined, unified: "stop" as const },
  usage: {
    inputTokens: {
      cacheRead: undefined,
      cacheWrite: undefined,
      noCache: 1,
      total: 1,
    },
    outputTokens: { reasoning: undefined, text: 1, total: 1 },
  },
  warnings: [],
});

const modelFor = (payload: unknown) =>
  new MockLanguageModelV4({ doGenerate: mockResult(payload) });

const promptFor = (model: MockLanguageModelV4) =>
  JSON.stringify(model.doGenerateCalls.at(0)?.prompt ?? null);

describe(categorizeItems, () => {
  it("returns an empty array without calling the model when there are no items", async () => {
    const model = modelFor({ items: [] });

    await expect(categorizeItems([], options, model)).resolves.toStrictEqual(
      []
    );
    expect(model.doGenerateCalls).toHaveLength(0);
  });

  it("maps each returned category to its item by index", async () => {
    const model = modelFor({
      items: [
        { category: "dairy-eggs", index: 0 },
        { category: "produce", index: 1 },
      ],
    });

    await expect(
      categorizeItems(
        [
          { kind: "product", name: "Milk 2L" },
          { kind: "product", name: "Bananas" },
        ],
        options,
        model
      )
    ).resolves.toStrictEqual(["dairy-eggs", "produce"]);
  });

  it("sends the taxonomy once and lists every item in the prompt", async () => {
    const model = modelFor({ items: [{ category: "produce", index: 0 }] });

    await categorizeItems(
      [{ kind: "product", name: "Bananas" }],
      options,
      model
    );

    const prompt = promptFor(model);
    expect(prompt.match(/dairy-eggs/gu)).toHaveLength(1);
    expect(prompt).toContain("Groceries: Dairy & Eggs");
    expect(prompt).toContain("0. [product] Bananas");
  });

  it("splits large receipts into chunks and keeps answers aligned", async () => {
    const model = modelFor({
      items: [
        { category: "other", index: 0 },
        { category: "other", index: 1 },
      ],
    });
    const items = Array.from({ length: 5 }, (_, index) => ({
      kind: "product",
      name: `Item ${index}`,
    }));

    await expect(
      categorizeItems(items, options, model, 2)
    ).resolves.toStrictEqual(["other", "other", "other", "other", "other"]);
    expect(model.doGenerateCalls).toHaveLength(3);
    expect(promptFor(model)).toContain("0. [product] Item 0");
  });

  it("ignores entries whose index is outside the chunk", async () => {
    const model = modelFor({ items: [{ category: "produce", index: 99 }] });

    await expect(
      categorizeItems([{ kind: "product", name: "X" }], options, model)
    ).resolves.toStrictEqual([null]);
  });

  it("rejects a category that is not in the taxonomy", async () => {
    const model = modelFor({
      items: [{ category: "not-a-category", index: 0 }],
    });

    await expect(
      categorizeItems([{ kind: "product", name: "X" }], options, model)
    ).rejects.toBeInstanceOf(NoObjectGeneratedError);
  });
});
