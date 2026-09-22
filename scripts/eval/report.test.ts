import { describe, expect, it } from "vitest";

import { printSummary, reportArchiveName, summarize } from "./report";
import type { FixtureResult } from "./report";

const field = (path: string, status: "match" | "mismatch") => ({
  actual: undefined,
  expected: undefined,
  path,
  status,
});

const result = (overrides: Partial<FixtureResult>): FixtureResult => ({
  fixture: "abc123",
  image: "receipts/abc123.jpg",
  ocrModel: "glm-ocr",
  parseModel: "google/gemma-4-e4b",
  ...overrides,
});

describe(summarize, () => {
  it("counts a thrown parse as a failure instead of dropping the fixture", () => {
    const summaries = summarize([
      result({ parseError: "No object generated: could not parse." }),
    ]);

    expect(summaries).toHaveLength(1);
    expect(summaries[0].parseFailures).toBe(1);
    expect(summaries[0].matched).toBe(0);
    expect(summaries[0].mismatched).toBe(0);
  });

  it("groups fixtures by model combo", () => {
    const summaries = summarize([
      result({
        eval: {
          fields: [
            field("merchant.name", "match"),
            field("totals.total", "match"),
          ],
          summary: { fields: 2, matched: 2, mismatched: 0, ocr: 0, parse: 0 },
        },
      }),
      result({
        eval: {
          fields: [
            field("merchant.name", "match"),
            field("totals.total", "mismatch"),
            field("items[3].name", "mismatch"),
          ],
          summary: { fields: 3, matched: 1, mismatched: 2, ocr: 1, parse: 1 },
        },
      }),
      result({
        eval: {
          fields: [field("merchant.name", "match")],
          summary: { fields: 1, matched: 1, mismatched: 0, ocr: 0, parse: 0 },
        },
        ocrModel: "other-ocr",
      }),
    ]);

    expect(summaries).toHaveLength(2);
    expect(summaries[0].matched).toBe(3);
    expect(summaries[0].mismatched).toBe(2);
    expect(summaries[0].parseFailures).toBe(0);
    expect(summaries[1].ocrModel).toBe("other-ocr");
  });

  it("folds indexed paths into their root contract field", () => {
    const summaries = summarize([
      result({
        eval: {
          fields: [
            field("merchant.name", "match"),
            field("merchant.address", "match"),
            field("totals.total", "mismatch"),
            field("items[3].name", "mismatch"),
          ],
          summary: { fields: 4, matched: 2, mismatched: 2, ocr: 0, parse: 2 },
        },
      }),
    ]);

    const [{ fields }] = summaries;
    expect(fields.merchant).toStrictEqual({ matched: 2, mismatched: 0 });
    expect(fields.totals).toStrictEqual({ matched: 0, mismatched: 1 });
    expect(fields.items).toStrictEqual({ matched: 0, mismatched: 1 });
  });

  it("averages per-stage timing across the fixtures that produced it", () => {
    const emptyEval = {
      fields: [],
      summary: { fields: 0, matched: 0, mismatched: 0, ocr: 0, parse: 0 },
    };
    const summaries = summarize([
      result({ eval: emptyEval, ocrMs: 100, parseMs: 50 }),
      result({ eval: emptyEval, ocrMs: 300 }),
      result({ parseError: "boom" }),
    ]);

    expect(summaries[0].ocrMs).toStrictEqual({ count: 2, total: 400 });
    expect(summaries[0].parseMs).toStrictEqual({ count: 1, total: 50 });
    expect(summaries[0].parseFailures).toBe(1);
  });

  it("skips OCR-only results, which have no parse model to score", () => {
    const summaries = summarize([
      result({ ocrMs: 100, parseModel: undefined }),
    ]);

    expect(summaries).toStrictEqual([]);
  });
});

describe(reportArchiveName, () => {
  it("makes a filesystem-safe, sortable name so runs accumulate", () => {
    expect(reportArchiveName("2026-09-22T18:14:03.512Z")).toBe(
      "report-2026-09-22T18-14-03-512Z.json"
    );
  });

  it("sorts chronologically", () => {
    const names = [
      reportArchiveName("2026-09-22T09:00:00.000Z"),
      reportArchiveName("2026-09-21T09:00:00.000Z"),
    ].toSorted();

    expect(names[0]).toContain("2026-09-21");
    expect(names[1]).toContain("2026-09-22");
  });
});

describe(printSummary, () => {
  it("prints the field breakdown without throwing", () => {
    const summaries = summarize([
      result({
        eval: {
          fields: [field("totals.total", "mismatch")],
          summary: { fields: 1, matched: 0, mismatched: 1, ocr: 0, parse: 1 },
        },
        ocrMs: 120,
        parseMs: 80,
      }),
    ]);

    expect(() => {
      printSummary(summaries);
    }).not.toThrow();
  });
});
