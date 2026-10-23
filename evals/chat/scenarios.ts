import "temporal-polyfill/global";
import { RECEIPT_TIMEZONE } from "@/lib/receipt/datetime";

/**
 * Scenario definitions for the real-model chat eval. Each check asserts one
 * part of a run's behaviour — which tools were called, with which arguments,
 * how many steps it took, or what the answer said — so a regression report
 * names the part that broke rather than just failing the prompt.
 */

export interface ToolCall {
  input: Record<string, unknown>;
  name: string;
  output: unknown;
}

export interface Observation {
  answer: string;
  steps: number;
  tools: ToolCall[];
}

export interface CheckResult {
  actual: string;
  ok: boolean;
}

export type CheckKind = "answer" | "clarification" | "steps" | "tools";

export interface Check {
  /** What a passing run looks like, printed in the results table. */
  expected: string;
  kind: CheckKind;
  run: (observation: Observation) => CheckResult;
}

export interface Scenario {
  checks: Check[];
  /** Short label for the results table. */
  name: string;
  prompt: string;
}

export interface ExpectedTool {
  input?: Record<string, unknown>;
  name: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * A search keyword is matched case-insensitively because `search_line_items`
 * uses `ilike`; every other string is exact, because the query behind it uses
 * `eq` — accepting a lowercased category name would let a call that returns no
 * rows pass.
 */
const CASE_INSENSITIVE_INPUTS = new Set(["query"]);

const sameValue = (key: string, expected: unknown, actual: unknown): boolean =>
  typeof expected === "string" &&
  typeof actual === "string" &&
  CASE_INSENSITIVE_INPUTS.has(key)
    ? expected.trim().toLowerCase() === actual.trim().toLowerCase()
    : expected === actual;

const matchesInput = (
  expected: Record<string, unknown>,
  actual: Record<string, unknown>
): boolean =>
  Object.entries(expected).every(([key, value]) =>
    sameValue(key, value, actual[key])
  );

export const formatTool = (tool: { input?: unknown; name: string }): string =>
  tool.input === undefined
    ? tool.name
    : `${tool.name} ${JSON.stringify(tool.input)}`;

export const describeToolCalls = (tools: { name: string }[]): string =>
  tools.length === 0
    ? "no tools"
    : tools.map((tool) => formatTool(tool)).join("; ");

const quote = (value: string) => JSON.stringify(value);

const includes = (text: string, phrase: string): boolean =>
  text.toLowerCase().includes(phrase.toLowerCase());

/**
 * Asserts the exact sequence of tool calls. Extra calls fail too: a question
 * that needs one lookup taking three is the kind of drift this eval exists to
 * see, not a pass with a footnote.
 */
export const expectTools = (expected: ExpectedTool[]): Check => ({
  expected: describeToolCalls(expected),
  kind: "tools",
  run: (observation) => {
    const actual = describeToolCalls(observation.tools);
    if (observation.tools.length !== expected.length) {
      return { actual, ok: false };
    }

    const ok = expected.every((tool, index) => {
      const called = observation.tools[index];
      return (
        called.name === tool.name &&
        (tool.input ? matchesInput(tool.input, called.input) : true)
      );
    });

    return { actual, ok };
  },
});

export const expectNoTools: Check = expectTools([]);

export const expectClarification: Check = {
  expected: "ask_user is called",
  kind: "clarification",
  run: (observation) => ({
    actual: describeToolCalls(observation.tools),
    ok: observation.tools.some((tool) => tool.name === "ask_user"),
  }),
};

export const expectAnswerContains = (phrases: string[]): Check => ({
  expected: `answer contains ${phrases.map(quote).join(", ")}`,
  kind: "answer",
  run: (observation) => {
    const missing = phrases.filter(
      (phrase) => !includes(observation.answer, phrase)
    );
    return {
      actual:
        missing.length === 0
          ? "all phrases present"
          : `missing ${missing.map(quote).join(", ")}`,
      ok: missing.length === 0,
    };
  },
});

/**
 * Flags a claim only in an unhedged sentence. A correct answer to "do I have
 * yogurt at home?" often uses the same words as a wrong one — "I can't tell
 * whether you have yogurt at home" — so sentence-level hedging is what
 * separates a refusal from a claim. The hedge is deliberately narrow: a plain
 * "you don't need to worry, you have yogurt at home" is still a claim.
 */
const HEDGE =
  /\b(?:can't|cannot|can not|couldn't|unable|no (?:way|information)|only (?:show|see|record|tell|track)|(?:don't|do not|doesn't|does not|didn't|did not) (?:have (?:information|data)|know|record|show|tell|track))\b/iu;

const sentences = (text: string): string[] =>
  text.split(/(?<=[.!?])\s+|\n+/u).filter((sentence) => sentence.length > 0);

export const expectNoClaim = (phrases: string[]): Check => ({
  expected: `answer avoids ${phrases.map(quote).join(", ")}`,
  kind: "answer",
  run: (observation) => {
    const claims = sentences(observation.answer)
      .filter((sentence) => !HEDGE.test(sentence))
      .filter((sentence) =>
        phrases.some((phrase) => includes(sentence, phrase))
      );
    return {
      actual:
        claims.length === 0
          ? "none of those phrases"
          : `claims in ${quote(claims[0])}`,
      ok: claims.length === 0,
    };
  },
});

export const expectMaxSteps = (max: number): Check => ({
  expected: `at most ${max} steps`,
  kind: "steps",
  run: (observation) => ({
    actual: `${observation.steps} ${observation.steps === 1 ? "step" : "steps"}`,
    ok: observation.steps <= max,
  }),
});

/**
 * `search_line_items` returns newest first, so the first row is the answer to
 * "when did I last buy …?". This reads the date out of the tool result rather
 * than the prompt: a scenario must prove the answer matches returned data, not
 * just that it contains a plausible-looking date.
 */
export const expectAnswerNamesNewestDate = (toolName: string): Check => ({
  expected: `answer names the newest ${toolName} date`,
  kind: "answer",
  run: (observation) => {
    const call = observation.tools.findLast((tool) => tool.name === toolName);
    const items = isRecord(call?.output)
      ? (call.output.items as { date?: string | null }[] | undefined)
      : undefined;
    const newest = items?.[0]?.date ?? null;

    if (!newest) {
      return {
        actual: `${toolName} returned no dated rows`,
        ok: false,
      };
    }

    const named = includes(observation.answer, newest);
    return {
      actual: named
        ? `newest date ${newest} is in the answer`
        : `newest date ${newest} is missing from the answer`,
      ok: named,
    };
  },
});

/**
 * "Last month" is the previous calendar month in the receipt timezone, the
 * period the model is told to derive from today's date. Computing it here keeps
 * the expectation correct whenever the eval runs.
 */
const today = Temporal.Now.plainDateISO(RECEIPT_TIMEZONE);
const thisMonthStart = today.with({ day: 1 });
const lastMonth = {
  from: thisMonthStart.subtract({ months: 1 }).toString(),
  to: thisMonthStart.subtract({ days: 1 }).toString(),
};

export const scenarios: Scenario[] = [
  {
    checks: [expectNoTools, expectMaxSteps(1)],
    name: "greeting",
    prompt: "Hello",
  },
  {
    checks: [
      expectTools([
        { input: { groupBy: "category" }, name: "spend_by_category" },
      ]),
      expectMaxSteps(2),
    ],
    name: "category breakdown, period given",
    prompt: "Breakdown by category this year",
  },
  {
    checks: [
      expectClarification,
      expectTools([{ name: "ask_user" }]),
      expectMaxSteps(1),
    ],
    name: "category breakdown, no period",
    prompt: "Breakdown by category",
  },
  {
    checks: [
      expectTools([{ input: lastMonth, name: "spend_by_merchant" }]),
      expectMaxSteps(2),
    ],
    name: "merchant spend, last month",
    prompt: "How much did I spend at Woolworths last month?",
  },
  {
    checks: [
      expectTools([{ input: { query: "cheese" }, name: "search_line_items" }]),
      expectMaxSteps(2),
    ],
    name: "find a product",
    prompt: "Find cheese",
  },
  {
    checks: [
      expectTools([
        { input: { category: "Groceries" }, name: "spend_by_category" },
      ]),
      expectMaxSteps(2),
    ],
    name: "top-level category total",
    prompt: "How much did I spend on groceries this year?",
  },
  {
    checks: [
      expectTools([{ input: { query: "yogurt" }, name: "search_line_items" }]),
      expectMaxSteps(2),
    ],
    name: "product history",
    prompt: "Have I bought yogurt before?",
  },
  {
    checks: [
      expectTools([{ name: "search_line_items" }]),
      expectAnswerNamesNewestDate("search_line_items"),
      expectMaxSteps(3),
    ],
    name: "last purchase date",
    prompt: "When did I last buy yogurt?",
  },
  {
    checks: [
      // Receipts record purchases, not pantry stock. Either searching or asking
      // is fine, but the answer must not turn a purchase into a current-stock
      // claim.
      expectNoClaim([
        "in your fridge",
        "in your pantry",
        "in stock",
        "right now you have",
        "you currently have",
        "you have some yogurt",
        "you have yogurt at home",
      ]),
      expectAnswerContains(["receipt"]),
    ],
    name: "current stock boundary",
    prompt: "Do I have yogurt at home?",
  },
];
