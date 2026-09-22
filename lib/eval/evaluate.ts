import type { ReceiptInformationExtraction } from "@/lib/db/contract";

export interface FixtureGolden {
  /** SHA-256 of the receipt image, which identifies the fixture. */
  id: string;
  /** Image path relative to the fixtures root. */
  image: string;
  /** The human-corrected extraction the model output is compared against. */
  extraction: ReceiptInformationExtraction;
  /**
   * Expected printed text per field path (e.g. `totals.total` → "78.58"),
   * used to tell an OCR error from a parse error.
   */
  evidence?: Record<string, string>;
  notes?: string;
}

export type FieldStatus = "match" | "mismatch";

export type ErrorClass = "ocr" | "parse";

export interface FieldDiff {
  path: string;
  expected: unknown;
  actual: unknown;
  status: FieldStatus;
  errorClass?: ErrorClass;
}

export interface EvalSummary {
  fields: number;
  matched: number;
  mismatched: number;
  ocr: number;
  parse: number;
}

export interface EvalResult {
  fields: FieldDiff[];
  summary: EvalSummary;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Flattens a nested extraction into `path → leaf` pairs, skipping absent
 * (undefined) values so an optional field the receipt does not print leaves no
 * path behind.
 */
const flatten = (value: unknown, prefix = ""): Map<string, unknown> => {
  const fields = new Map<string, unknown>();

  if (value === undefined) {
    return fields;
  }

  if (Array.isArray(value)) {
    for (const [index, entry] of value.entries()) {
      for (const [path, leaf] of flatten(entry, `${prefix}[${index}]`)) {
        fields.set(path, leaf);
      }
    }
    return fields;
  }

  if (isPlainObject(value)) {
    for (const [key, entry] of Object.entries(value)) {
      const path = prefix ? `${prefix}.${key}` : key;
      for (const [leafPath, leaf] of flatten(entry, path)) {
        fields.set(leafPath, leaf);
      }
    }
    return fields;
  }

  fields.set(prefix, value);
  return fields;
};

const normalizeText = (value: string) =>
  value.toLowerCase().replaceAll(/\s+/gu, " ").trim();

const transcriptContains = (transcript: string, evidence: string) => {
  const needle = normalizeText(evidence);
  return needle.length > 0 && normalizeText(transcript).includes(needle);
};

const renderValue = (value: unknown): string => {
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  if (typeof value === "string" || typeof value === "boolean") {
    return String(value);
  }
  return "";
};

/**
 * Classifies a mismatch. When the golden states no expected value the model
 * invented the field (a parse fault). Otherwise the golden's expected printed
 * text is looked for in the transcript: present means the parser had what it
 * needed (parse error), absent means OCR never captured it (OCR error).
 */
const classifyMismatch = (
  golden: FixtureGolden,
  transcript: string,
  path: string,
  expected: unknown
): ErrorClass => {
  if (expected === undefined || expected === null) {
    return "parse";
  }

  const evidence = golden.evidence?.[path] ?? renderValue(expected);
  return transcriptContains(transcript, evidence) ? "parse" : "ocr";
};

/**
 * Compares a model's extraction against a fixture's golden and reports every
 * field, classifying each mismatch as an OCR or parse error. Pure: no database,
 * model, or network.
 */
export const evaluateExtraction = ({
  golden,
  transcript,
  extraction,
}: {
  golden: FixtureGolden;
  transcript: string;
  extraction: ReceiptInformationExtraction;
}): EvalResult => {
  const expectedFields = flatten(golden.extraction);
  const actualFields = flatten(extraction);
  const paths = [
    ...new Set([...expectedFields.keys(), ...actualFields.keys()]),
  ].toSorted();

  const fields = paths.map((path): FieldDiff => {
    const expected = expectedFields.get(path);
    const actual = actualFields.get(path);

    if (Object.is(expected, actual)) {
      return { actual, expected, path, status: "match" };
    }

    return {
      actual,
      errorClass: classifyMismatch(golden, transcript, path, expected),
      expected,
      path,
      status: "mismatch",
    };
  });

  const mismatched = fields.filter((field) => field.status === "mismatch");

  return {
    fields,
    summary: {
      fields: fields.length,
      matched: fields.length - mismatched.length,
      mismatched: mismatched.length,
      ocr: mismatched.filter((field) => field.errorClass === "ocr").length,
      parse: mismatched.filter((field) => field.errorClass === "parse").length,
    },
  };
};
