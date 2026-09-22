import { ORC_MODEL, PARSE_MODEL } from "@/lib/ai/provider";

export type Pass = "both" | "ocr" | "parse";

export interface Args {
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

export const parseArgs = (argv: string[]): Args => {
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

export const usage = () => USAGE;
