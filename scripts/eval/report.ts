import type { ReceiptInformationExtraction } from "@/lib/db/contract";
import type { EvalResult } from "@/lib/eval/evaluate";

export interface FixtureResult {
  eval?: EvalResult;
  extraction?: ReceiptInformationExtraction;
  fixture: string;
  image: string;
  ocrModel: string;
  parseError?: string;
  parseModel?: string;
  transcript?: string;
}

export interface ModelSummary {
  matched: number;
  mismatched: number;
  ocr: number;
  ocrModel: string;
  parse: number;
  parseModel: string;
}

export const summarize = (results: FixtureResult[]): ModelSummary[] => {
  const byModel = new Map<string, ModelSummary>();

  for (const result of results) {
    if (!result.eval || !result.parseModel) {
      continue;
    }
    const key = `${result.ocrModel}\u0000${result.parseModel}`;
    const summary = byModel.get(key) ?? {
      matched: 0,
      mismatched: 0,
      ocr: 0,
      ocrModel: result.ocrModel,
      parse: 0,
      parseModel: result.parseModel,
    };
    summary.matched += result.eval.summary.matched;
    summary.mismatched += result.eval.summary.mismatched;
    summary.ocr += result.eval.summary.ocr;
    summary.parse += result.eval.summary.parse;
    byModel.set(key, summary);
  }

  return [...byModel.values()];
};

const formatValue = (value: unknown) =>
  value === undefined ? "∅" : JSON.stringify(value);

export const printResult = (result: FixtureResult) => {
  const label = `${result.ocrModel} → ${result.parseModel ?? "—"}`;

  if (result.parseError) {
    console.log(
      `  FAIL ${result.fixture.slice(0, 8)} ${label}: ${result.parseError}`
    );
    return;
  }

  if (!result.eval) {
    const length = result.transcript?.length ?? 0;
    console.log(
      `  OCR  ${result.fixture.slice(0, 8)} ${label}: ${length} chars`
    );
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
