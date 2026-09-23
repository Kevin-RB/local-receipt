import type { ReceiptInformationExtraction } from "@/lib/db/contract";
import type { EvalResult } from "@/lib/eval/evaluate";
import type { TranscriptScore } from "@/lib/eval/transcript";

export interface FixtureResult {
  eval?: EvalResult;
  extraction?: ReceiptInformationExtraction;
  fixture: string;
  image: string;
  ocrModel: string;
  /** Wall-clock ms for the OCR pass, when it ran. */
  ocrMs?: number;
  parseError?: string;
  parseModel?: string;
  /** Wall-clock ms for the parse pass, when it ran and did not throw. */
  parseMs?: number;
  transcript?: string;
  /** Scored against the golden transcript, when the fixture has one. */
  transcriptScore?: TranscriptScore;
}

export interface FieldBreakdown {
  matched: number;
  mismatched: number;
}

export interface Average {
  count: number;
  total: number;
}

export interface ModelSummary {
  /** Per top-level contract field (merchant, totals, items, ...). */
  fields: Record<string, FieldBreakdown>;
  matched: number;
  mismatched: number;
  ocr: number;
  ocrMs: Average;
  ocrModel: string;
  parse: number;
  parseFailures: number;
  parseModel: string;
  parseMs: Average;
}

/** `merchant.address` and `items[3].name` both collapse to their root field. */
const rootField = (path: string) => path.split(/[.[]/u, 1)[0] ?? path;

const freshSummary = (ocrModel: string, parseModel: string): ModelSummary => ({
  fields: {},
  matched: 0,
  mismatched: 0,
  ocr: 0,
  ocrModel,
  ocrMs: { count: 0, total: 0 },
  parse: 0,
  parseFailures: 0,
  parseModel,
  parseMs: { count: 0, total: 0 },
});

const addTime = (average: Average, ms: number | undefined) => {
  if (ms === undefined) {
    return;
  }
  average.count += 1;
  average.total += ms;
};

/**
 * Aggregates per-fixture results into one summary per OCR → parse model combo.
 * Fixtures whose parse pass threw are counted as parse failures rather than
 * dropped, so a model that cannot honour the schema is still reported.
 */
export const summarize = (results: FixtureResult[]): ModelSummary[] => {
  const byModel = new Map<string, ModelSummary>();

  for (const result of results) {
    if (!result.parseModel) {
      continue;
    }
    const key = `${result.ocrModel}\u0000${result.parseModel}`;
    const summary =
      byModel.get(key) ?? freshSummary(result.ocrModel, result.parseModel);
    byModel.set(key, summary);

    addTime(summary.ocrMs, result.ocrMs);
    addTime(summary.parseMs, result.parseMs);

    if (!result.eval) {
      summary.parseFailures += 1;
      continue;
    }

    summary.matched += result.eval.summary.matched;
    summary.mismatched += result.eval.summary.mismatched;
    summary.ocr += result.eval.summary.ocr;
    summary.parse += result.eval.summary.parse;

    for (const field of result.eval.fields) {
      const root = rootField(field.path);
      const breakdown = summary.fields[root] ?? { matched: 0, mismatched: 0 };
      if (field.status === "match") {
        breakdown.matched += 1;
      } else {
        breakdown.mismatched += 1;
      }
      summary.fields[root] = breakdown;
    }
  }

  return [...byModel.values()];
};

/**
 * Archive name for a run: one report per run, so successive model
 * comparisons accumulate instead of overwriting each other. `:` and `.` are
 * replaced because they are unsafe on some filesystems.
 */
export const reportArchiveName = (generatedAt: string) =>
  `report-${generatedAt.replaceAll(/[:.]/gu, "-")}.json`;

const formatValue = (value: unknown) =>
  value === undefined ? "∅" : JSON.stringify(value);

export interface OcrSummary {
  /** Mean CER across scored fixtures. */
  cer: Average;
  fixtures: number;
  missingLines: number;
  ocrModel: string;
  /** Mean WER across scored fixtures. */
  wer: Average;
}

/**
 * Aggregates OCR quality by model, over fixtures that have a golden transcript.
 * Kept separate from the parse summary because OCR is scored on text, not
 * fields.
 */
export const summarizeOcr = (results: FixtureResult[]): OcrSummary[] => {
  const byModel = new Map<string, OcrSummary>();

  for (const result of results) {
    if (!result.transcriptScore) {
      continue;
    }
    const summary = byModel.get(result.ocrModel) ?? {
      cer: { count: 0, total: 0 },
      fixtures: 0,
      missingLines: 0,
      ocrModel: result.ocrModel,
      wer: { count: 0, total: 0 },
    };
    summary.fixtures += 1;
    summary.cer.count += 1;
    summary.cer.total += result.transcriptScore.cer;
    summary.wer.count += 1;
    summary.wer.total += result.transcriptScore.wer;
    summary.missingLines += result.transcriptScore.missingLines.length;
    byModel.set(result.ocrModel, summary);
  }

  return [...byModel.values()];
};

const formatPercent = (average: Average) =>
  average.count === 0
    ? "n/a"
    : `${((average.total / average.count) * 100).toFixed(2)}%`;

export const printOcrSummary = (summaries: OcrSummary[]) => {
  if (summaries.length === 0) {
    return;
  }
  console.log("\nOCR quality (vs golden transcript):");
  for (const summary of summaries) {
    console.log(
      `  ${summary.ocrModel}: ${summary.fixtures} fixtures, CER ${formatPercent(summary.cer)}, WER ${formatPercent(summary.wer)}, ${summary.missingLines} golden lines missing`
    );
  }
};

const formatDuration = (average: Average) =>
  average.count === 0
    ? "n/a"
    : `${Math.round(average.total / average.count)}ms`;

const formatRate = (value: number, total: number) =>
  total === 0 ? "n/a" : `${value}/${total}`;

export const printResult = (result: FixtureResult) => {
  const label = `${result.ocrModel} → ${result.parseModel ?? "—"}`;

  if (result.parseError) {
    console.log(
      `  FAIL ${result.fixture.slice(0, 8)} ${label}: ${result.parseError}`
    );
    return;
  }

  if (!result.eval) {
    const score = result.transcriptScore;
    const length = result.transcript?.length ?? 0;
    console.log(
      `  OCR  ${result.fixture.slice(0, 8)} ${label}: ${length} chars${
        score
          ? `, CER ${(score.cer * 100).toFixed(1)}%, WER ${(score.wer * 100).toFixed(1)}%`
          : ""
      }`
    );
    for (const line of score?.missingLines ?? []) {
      console.log(`        [missing] ${line}`);
    }
    return;
  }

  const { summary } = result.eval;
  const status =
    summary.mismatched === 0
      ? "OK  "
      : `${String(summary.mismatched).padStart(3)}`;
  console.log(
    `  ${status} ${result.fixture.slice(0, 8)} ${label}: ${summary.matched}/${summary.fields} fields, ocr ${summary.ocr}, parse ${summary.parse}`
  );
  for (const field of result.eval.fields.filter(
    (entry) => entry.status === "mismatch"
  )) {
    console.log(
      `        [${field.errorClass}] ${field.path}: expected ${formatValue(field.expected)}, got ${formatValue(field.actual)}`
    );
  }
};

export const printSummary = (summaries: ModelSummary[]) => {
  console.log("");
  for (const summary of summaries) {
    console.log(
      `${summary.ocrModel} → ${summary.parseModel}: ${summary.matched} matched, ${summary.mismatched} mismatched (ocr ${summary.ocr}, parse ${summary.parse}), ${summary.parseFailures} parse failed, avg ocr ${formatDuration(summary.ocrMs)}, parse ${formatDuration(summary.parseMs)}`
    );

    const fields = Object.entries(summary.fields).toSorted(([a], [b]) =>
      a.localeCompare(b)
    );
    if (fields.length === 0) {
      continue;
    }
    for (const [field, breakdown] of fields) {
      const total = breakdown.matched + breakdown.mismatched;
      console.log(
        `  ${field.padEnd(14)} ${formatRate(breakdown.matched, total)}${
          breakdown.mismatched > 0
            ? `  (${breakdown.mismatched} mismatched)`
            : ""
        }`
      );
    }
  }
};
