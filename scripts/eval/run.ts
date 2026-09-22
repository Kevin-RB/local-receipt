import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod/v4";

import { ORC_MODEL, PARSE_MODEL } from "@/lib/ai/provider";
import {
  parseReceiptText,
  transcribeReceiptImage,
} from "@/lib/ai/transcribe-receipt-image";
import { ReceiptInformationExtractionSchema } from "@/lib/db/contract";
import type { ReceiptInformationExtraction } from "@/lib/db/contract";
import { evaluateExtraction } from "@/lib/eval/evaluate";
import type { EvalResult, FixtureGolden } from "@/lib/eval/evaluate";
import { dedupeByHash, fixtureId } from "@/lib/eval/fixtures";
import { normalizeExtractedItems } from "@/lib/receipt/extraction";
import { contentTypeFromKey } from "@/lib/storage/content-type";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);

type Pass = "both" | "ocr" | "parse";

interface Args {
  fixtures: string;
  help: boolean;
  index?: string;
  only: string[];
  out: string;
  ocrModels: string[];
  parseModels: string[];
  pass: Pass;
  transcript?: string;
}

interface FixtureResult {
  eval?: EvalResult;
  extraction?: ReceiptInformationExtraction;
  fixture: string;
  image: string;
  ocrModel: string;
  parseError?: string;
  parseModel?: string;
  transcript?: string;
}

interface ModelSummary {
  matched: number;
  mismatched: number;
  ocr: number;
  ocrModel: string;
  parse: number;
  parseModel: string;
}

const USAGE = `Receipt extraction-quality harness.

Usage: pnpm eval [options]

Options:
  --fixtures <dir>       Fixture root (default: fixtures)
  --out <dir>            Report output dir (default: fixtures/report)
  --ocr-model <id>       OCR model to run; repeatable (default: ORC_MODEL)
  --parse-model <id>     Parse model to run; repeatable (default: PARSE_MODEL)
  --fixture <id>         Only run this fixture id; repeatable
  --pass <both|ocr|parse>  Which passes to run (default: both)
  --transcript <path>    Transcript file for --pass parse
  --index <dir>          Hash a source image dir into fixtures/receipts, skipping duplicates
  --help                 Show this message

Fixtures live under <fixtures>/receipts (images) and <fixtures>/golden (JSON).
Both are gitignored; see scripts/eval/README.md for the golden format.`;

const parseArgs = (argv: string[]): Args => {
  const args: Args = {
    fixtures: "fixtures",
    help: false,
    ocrModels: [],
    only: [],
    out: "fixtures/report",
    parseModels: [],
    pass: "both",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = () => {
      const next = argv[index + 1];
      if (next === undefined) {
        throw new Error(`Missing value for ${flag}`);
      }
      index += 1;
      return next;
    };

    switch (flag) {
      case "--fixtures": {
        args.fixtures = value();
        break;
      }
      case "--out": {
        args.out = value();
        break;
      }
      case "--ocr-model": {
        args.ocrModels.push(value());
        break;
      }
      case "--parse-model": {
        args.parseModels.push(value());
        break;
      }
      case "--fixture": {
        args.only.push(value());
        break;
      }
      case "--pass": {
        const pass = value();
        if (pass !== "both" && pass !== "ocr" && pass !== "parse") {
          throw new Error(`Invalid --pass value: ${pass}`);
        }
        args.pass = pass;
        break;
      }
      case "--transcript": {
        args.transcript = value();
        break;
      }
      case "--index": {
        args.index = value();
        break;
      }
      case "--help": {
        args.help = true;
        break;
      }
      default: {
        throw new Error(`Unknown argument: ${flag}`);
      }
    }
  }

  if (args.ocrModels.length === 0) {
    args.ocrModels = [ORC_MODEL];
  }
  if (args.parseModels.length === 0) {
    args.parseModels = [PARSE_MODEL];
  }

  return args;
};

const goldenSchema = z.object({
  evidence: z.record(z.string(), z.string()).optional(),
  extraction: ReceiptInformationExtractionSchema,
  id: z.string().min(1),
  image: z.string().min(1),
  notes: z.string().optional(),
});

const loadGoldens = async (args: Args): Promise<FixtureGolden[]> => {
  const goldenDir = path.join(args.fixtures, "golden");
  let files: string[];
  try {
    files = await readdir(goldenDir);
  } catch {
    throw new Error(
      `No golden directory at ${goldenDir}. Add goldens there (see scripts/eval/README.md).`
    );
  }

  const loaded = await Promise.all(
    files
      .filter((entry) => entry.endsWith(".json"))
      .toSorted()
      .map(async (file) => {
        const raw: unknown = JSON.parse(
          await readFile(path.join(goldenDir, file), "utf-8")
        );
        const parsed = goldenSchema.safeParse(raw);
        if (!parsed.success) {
          throw new Error(
            `${file} is not a valid golden: ${parsed.error.message}`
          );
        }
        return parsed.data;
      })
  );

  const goldens =
    args.only.length === 0
      ? loaded
      : loaded.filter((golden) => args.only.includes(golden.id));

  if (goldens.length === 0) {
    throw new Error(
      "No fixtures selected. Check --fixture and the golden dir."
    );
  }

  const { duplicates } = dedupeByHash(
    goldens.map((golden) => ({ hash: golden.id, path: golden.image }))
  );
  for (const duplicate of duplicates) {
    console.warn(
      `warning: duplicate fixture ${duplicate.path} shares hash ${duplicate.hash}`
    );
  }

  return goldens;
};

const readFixtureImage = async (golden: FixtureGolden, root: string) => {
  const bytes = await readFile(path.join(root, golden.image));
  const hash = fixtureId(bytes);
  if (hash !== golden.id) {
    throw new Error(
      `Fixture ${golden.id} (${golden.image}) hashes to ${hash}; fix the golden id.`
    );
  }
  return bytes;
};

const parseModelOutput = (raw: unknown) => {
  const parsed = ReceiptInformationExtractionSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.message } as const;
  }
  return {
    extraction: {
      ...parsed.data,
      items: normalizeExtractedItems(parsed.data.items),
    },
  } as const;
};

const runBoth = async (
  golden: FixtureGolden,
  root: string,
  ocrModel: string,
  parseModel: string
): Promise<FixtureResult> => {
  const bytes = await readFixtureImage(golden, root);
  const transcript = await transcribeReceiptImage(
    bytes.toString("base64"),
    contentTypeFromKey(golden.image)
  );
  const parsed = parseModelOutput(await parseReceiptText(transcript));

  if ("error" in parsed) {
    return {
      fixture: golden.id,
      image: golden.image,
      ocrModel,
      parseError: parsed.error,
      parseModel,
      transcript,
    };
  }

  return {
    eval: evaluateExtraction({
      extraction: parsed.extraction,
      golden,
      transcript,
    }),
    extraction: parsed.extraction,
    fixture: golden.id,
    image: golden.image,
    ocrModel,
    parseModel,
    transcript,
  };
};

const runOcr = async (
  golden: FixtureGolden,
  root: string,
  ocrModel: string
): Promise<FixtureResult> => {
  const bytes = await readFixtureImage(golden, root);
  const transcript = await transcribeReceiptImage(
    bytes.toString("base64"),
    contentTypeFromKey(golden.image)
  );
  return {
    fixture: golden.id,
    image: golden.image,
    ocrModel,
    transcript,
  };
};

const runParse = async (
  golden: FixtureGolden,
  root: string,
  parseModel: string,
  transcript: string
): Promise<FixtureResult> => {
  await readFixtureImage(golden, root);
  const parsed = parseModelOutput(await parseReceiptText(transcript));

  if ("error" in parsed) {
    return {
      fixture: golden.id,
      image: golden.image,
      ocrModel: "external",
      parseError: parsed.error,
      parseModel,
      transcript,
    };
  }

  return {
    eval: evaluateExtraction({
      extraction: parsed.extraction,
      golden,
      transcript,
    }),
    extraction: parsed.extraction,
    fixture: golden.id,
    image: golden.image,
    ocrModel: "external",
    parseModel,
    transcript,
  };
};

const formatValue = (value: unknown) =>
  value === undefined ? "∅" : JSON.stringify(value);

const printResult = (result: FixtureResult) => {
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

const summarize = (results: FixtureResult[]): ModelSummary[] => {
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

const indexSource = async (source: string, root: string) => {
  const entries = await readdir(source);
  const files = entries.filter((file) =>
    IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase())
  );
  const hashed = await Promise.all(
    files.map(async (file) => ({
      hash: fixtureId(await readFile(path.join(source, file))),
      path: file,
    }))
  );
  const { duplicates, unique } = dedupeByHash(hashed);

  const receiptsDir = path.join(root, "receipts");
  await mkdir(receiptsDir, { recursive: true });
  await Promise.all(
    unique.map(async (image) => {
      const bytes = await readFile(path.join(source, image.path));
      const extension = path.extname(image.path).toLowerCase();
      await writeFile(
        path.join(receiptsDir, `${image.hash}${extension}`),
        bytes
      );
    })
  );

  console.log(`Indexed ${unique.length} unique receipts into ${receiptsDir}.`);
  for (const image of unique) {
    console.log(`  ${image.hash}  <- ${image.path}`);
  }
  for (const duplicate of duplicates) {
    console.log(`  skipped duplicate: ${duplicate.path} (${duplicate.hash})`);
  }
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(USAGE);
    return;
  }

  if (args.index) {
    await indexSource(args.index, args.fixtures);
    return;
  }

  const root = path.resolve(args.fixtures);
  const goldens = await loadGoldens(args);
  let results: FixtureResult[];

  if (args.pass === "both") {
    const pairs = args.ocrModels.flatMap((ocrModel) =>
      args.parseModels.map((parseModel) => ({ ocrModel, parseModel }))
    );
    results = await Promise.all(
      pairs.flatMap(({ ocrModel, parseModel }) =>
        goldens.map((golden) => runBoth(golden, root, ocrModel, parseModel))
      )
    );
  } else if (args.pass === "ocr") {
    results = await Promise.all(
      args.ocrModels.flatMap((ocrModel) =>
        goldens.map((golden) => runOcr(golden, root, ocrModel))
      )
    );
  } else {
    if (goldens.length !== 1) {
      throw new Error("--pass parse expects exactly one --fixture");
    }
    if (!args.transcript) {
      throw new Error("--pass parse requires --transcript <path>");
    }
    const transcript = await readFile(args.transcript, "utf-8");
    results = await Promise.all(
      args.parseModels.map((parseModel) =>
        runParse(goldens[0], root, parseModel, transcript)
      )
    );
  }

  const report = {
    fixtures: goldens.length,
    generatedAt: new Date().toISOString(),
    models: { ocr: args.ocrModels, parse: args.parseModels },
    pass: args.pass,
    results,
    summary: summarize(results),
  };

  await mkdir(args.out, { recursive: true });
  const reportPath = path.join(args.out, "report.json");
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log(`\nExtraction evaluation (${args.pass}):`);
  for (const result of results) {
    printResult(result);
  }
  console.log("");
  for (const summary of report.summary) {
    console.log(
      `${summary.ocrModel} → ${summary.parseModel}: ${summary.matched} matched, ${summary.mismatched} mismatched (ocr ${summary.ocr}, parse ${summary.parse})`
    );
  }
  console.log(`\nReport written to ${reportPath}`);
};

try {
  await main();
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
