import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { registerAiDevTools } from "@/lib/ai/devtools";
import { isUnreachableError } from "@/lib/ai/errors";
import { LM_STUDIO_URL } from "@/lib/ai/provider";
import {
  parseReceiptText,
  transcribeReceiptImage,
} from "@/lib/ai/transcribe-receipt-image";
import { ReceiptInformationExtractionSchema } from "@/lib/db/contract";
import { evaluateExtraction } from "@/lib/eval/evaluate";
import type { FixtureGolden } from "@/lib/eval/golden";
import { scoreTranscript } from "@/lib/eval/transcript";
import type { TranscriptScore } from "@/lib/eval/transcript";
import { normalizeExtractedItems } from "@/lib/receipt/extraction";
import { contentTypeFromKey } from "@/lib/storage/content-type";

import { parseArgs, usage } from "./args";
import { indexSource, loadGoldens, readFixtureImage } from "./fixtures";
import {
  printOcrSummary,
  printResult,
  printSummary,
  reportArchiveName,
  summarize,
  summarizeOcr,
} from "./report";
import type { FixtureResult } from "./report";

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

// A local LM Studio serves one generation at a time reliably, so the fixtures
// run sequentially rather than fanning out and getting rejected.
const runSequentially = async <T>(
  tasks: (() => Promise<T>)[]
): Promise<T[]> => {
  const results: T[] = [];
  for (const task of tasks) {
    // oxlint-disable-next-line no-await-in-loop
    results.push(await task());
  }
  return results;
};

const providerUnreachable = (error: unknown): Error =>
  new Error(
    `LM Studio is not reachable at ${LM_STUDIO_URL}. Start LM Studio and try again.`,
    { cause: error }
  );

const withLmStudio = async <T>(call: () => Promise<T>): Promise<T> => {
  try {
    return await call();
  } catch (error) {
    if (isUnreachableError(error)) {
      throw providerUnreachable(error);
    }
    throw error;
  }
};

interface ParsePass {
  parseMs: number;
  parsed: ReturnType<typeof parseModelOutput>;
}

/**
 * Runs the parse pass, timing it. An unreachable server aborts the run; a
 * model that returns unusable JSON is reported as a failed parse instead,
 * because that rate is itself a result worth seeing.
 */
const runParsePass = async (
  transcript: string,
  parseModel: string
): Promise<ParsePass> => {
  const startedAt = Date.now();
  try {
    const output = await parseReceiptText(transcript, parseModel);
    return {
      parseMs: Date.now() - startedAt,
      parsed: parseModelOutput(output),
    };
  } catch (error) {
    if (isUnreachableError(error)) {
      throw providerUnreachable(error);
    }
    return {
      parseMs: Date.now() - startedAt,
      parsed: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
};

const scoreAgainstGolden = (
  golden: FixtureGolden,
  transcript: string
): TranscriptScore | undefined =>
  golden.transcript
    ? scoreTranscript({ actual: transcript, golden: golden.transcript })
    : undefined;

const buildResult = (
  golden: FixtureGolden,
  models: { ocrModel: string; parseModel: string },
  transcript: string,
  parsed: ReturnType<typeof parseModelOutput>,
  timing: {
    ocrMs?: number;
    parseMs?: number;
    transcriptScore?: TranscriptScore;
  } = {}
): FixtureResult => {
  const base = {
    fixture: golden.id,
    image: golden.image,
    ocrModel: models.ocrModel,
    parseModel: models.parseModel,
    transcript,
    ...timing,
  };

  if ("error" in parsed) {
    return { ...base, parseError: parsed.error };
  }

  return {
    ...base,
    eval: evaluateExtraction({
      extraction: parsed.extraction,
      golden,
      transcript,
    }),
    extraction: parsed.extraction,
  };
};

const runBoth = async (
  golden: FixtureGolden,
  root: string,
  ocrModel: string,
  parseModel: string
): Promise<FixtureResult> => {
  const bytes = await readFixtureImage(golden, root);
  const ocrStartedAt = Date.now();
  const transcript = await withLmStudio(() =>
    transcribeReceiptImage(
      bytes.toString("base64"),
      contentTypeFromKey(golden.image),
      ocrModel
    )
  );
  const ocrMs = Date.now() - ocrStartedAt;
  const { parseMs, parsed } = await runParsePass(transcript, parseModel);

  return buildResult(golden, { ocrModel, parseModel }, transcript, parsed, {
    ocrMs,
    parseMs,
    transcriptScore: scoreAgainstGolden(golden, transcript),
  });
};

const runOcr = async (
  golden: FixtureGolden,
  root: string,
  ocrModel: string
): Promise<FixtureResult> => {
  const bytes = await readFixtureImage(golden, root);
  const ocrStartedAt = Date.now();
  const transcript = await withLmStudio(() =>
    transcribeReceiptImage(
      bytes.toString("base64"),
      contentTypeFromKey(golden.image),
      ocrModel
    )
  );
  return {
    fixture: golden.id,
    image: golden.image,
    ocrModel,
    ocrMs: Date.now() - ocrStartedAt,
    transcript,
    transcriptScore: scoreAgainstGolden(golden, transcript),
  };
};

const runParse = async (
  golden: FixtureGolden,
  root: string,
  parseModel: string,
  transcript: string
): Promise<FixtureResult> => {
  await readFixtureImage(golden, root);
  const { parseMs, parsed } = await runParsePass(transcript, parseModel);
  return buildResult(
    golden,
    { ocrModel: "external", parseModel },
    transcript,
    parsed,
    { parseMs }
  );
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));

  if (process.env.NODE_ENV !== "production") {
    registerAiDevTools();
  }

  if (args.help) {
    console.log(usage());
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
    results = await runSequentially(
      pairs.flatMap(({ ocrModel, parseModel }) =>
        goldens.map(
          (golden) => () => runBoth(golden, root, ocrModel, parseModel)
        )
      )
    );
  } else if (args.pass === "ocr") {
    results = await runSequentially(
      args.ocrModels.flatMap((ocrModel) =>
        goldens.map((golden) => () => runOcr(golden, root, ocrModel))
      )
    );
  } else {
    const externalTranscript = args.transcript
      ? await readFile(args.transcript, "utf-8")
      : undefined;
    if (externalTranscript && goldens.length !== 1) {
      throw new Error(
        "--pass parse with --transcript expects exactly one --fixture"
      );
    }
    const tasks = args.parseModels.flatMap((parseModel) =>
      goldens.map((golden) => () => {
        const transcript = externalTranscript ?? golden.transcript;
        if (!transcript) {
          throw new Error(
            `Fixture ${golden.id.slice(0, 8)} has no golden transcript; add one or pass --transcript`
          );
        }
        return runParse(golden, root, parseModel, transcript);
      })
    );
    results = await runSequentially(tasks);
  }

  const report = {
    fixtures: goldens.length,
    generatedAt: new Date().toISOString(),
    models: { ocr: args.ocrModels, parse: args.parseModels },
    ocrSummary: summarizeOcr(results),
    pass: args.pass,
    results,
    summary: summarize(results),
  };

  await mkdir(args.out, { recursive: true });
  const body = `${JSON.stringify(report, null, 2)}\n`;
  // One archive per run, plus `report.json` as the most recent run.
  const archivePath = path.join(
    args.out,
    reportArchiveName(report.generatedAt)
  );
  const reportPath = path.join(args.out, "report.json");
  await Promise.all([
    writeFile(archivePath, body),
    writeFile(reportPath, body),
  ]);

  console.log(`\nExtraction evaluation (${args.pass}):`);
  for (const result of results) {
    printResult(result);
  }
  printSummary(report.summary);
  printOcrSummary(report.ocrSummary);
  console.log(`\nReport written to ${archivePath} (and ${reportPath})`);
};

try {
  await main();
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
