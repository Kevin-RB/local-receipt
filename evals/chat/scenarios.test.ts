import { describe, expect, it } from "vitest";

import type { Observation } from "./scenarios";
import {
  expectAnswerNamesNewestDate,
  expectNoClaim,
  expectTools,
} from "./scenarios";

const observation = (overrides: Partial<Observation> = {}): Observation => ({
  answer: "",
  steps: 1,
  tools: [],
  ...overrides,
});

describe(expectTools, () => {
  it("matches tool names and a partial input case-insensitively", () => {
    const result = expectTools([
      { input: { query: "cheese" }, name: "search_line_items" },
    ]).run(
      observation({
        tools: [
          {
            input: { query: "Cheese", to: "2026-09-30" },
            name: "search_line_items",
            output: {},
          },
        ],
      })
    );

    expect(result).toStrictEqual({
      actual: 'search_line_items {"query":"Cheese","to":"2026-09-30"}',
      ok: true,
    });
  });

  it("does not accept a category whose case differs, since the query is exact", () => {
    expect(
      expectTools([
        { input: { category: "Groceries" }, name: "spend_by_category" },
      ]).run(
        observation({
          tools: [
            {
              input: { category: "groceries" },
              name: "spend_by_category",
              output: {},
            },
          ],
        })
      ).ok
    ).toBeFalsy();
  });

  it("fails an extra tool call rather than ignoring it", () => {
    expect(
      expectTools([{ name: "search_line_items" }]).run(
        observation({
          tools: [
            { input: {}, name: "search_line_items", output: {} },
            { input: {}, name: "receipt_detail", output: {} },
          ],
        })
      ).ok
    ).toBeFalsy();
  });
});

describe(expectNoClaim, () => {
  const check = expectNoClaim(["you have yogurt at home"]);

  it("ignores a hedged sentence that repeats the words", () => {
    expect(
      check.run(
        observation({
          answer:
            "I can't tell whether you have yogurt at home from receipts alone.",
        })
      ).ok
    ).toBeTruthy();
  });

  it("fails an unhedged claim", () => {
    expect(
      check.run(observation({ answer: "You have yogurt at home." })).ok
    ).toBeFalsy();
  });

  it("does not treat a reassurance as a hedge", () => {
    expect(
      check.run(
        observation({
          answer: "You don't need to worry, you have yogurt at home.",
        })
      ).ok
    ).toBeFalsy();
  });
});

describe(expectAnswerNamesNewestDate, () => {
  const check = expectAnswerNamesNewestDate("search_line_items");

  it("passes when the answer names the newest returned date", () => {
    expect(
      check.run(
        observation({
          answer: "The most recent purchase was on 2026-09-12.",
          tools: [
            {
              input: {},
              name: "search_line_items",
              output: {
                items: [{ date: "2026-09-12" }, { date: "2026-08-01" }],
              },
            },
          ],
        })
      ).ok
    ).toBeTruthy();
  });

  it("fails when the tool returned no rows", () => {
    expect(
      check.run(
        observation({
          tools: [
            { input: {}, name: "search_line_items", output: { items: [] } },
          ],
        })
      ).ok
    ).toBeFalsy();
  });
});
