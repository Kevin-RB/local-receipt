import { NoObjectGeneratedError } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  PARSE_PROMPT,
  TRANSCRIPTION_PROMPT,
  parseReceiptText,
  transcribeReceiptImage,
} from "./transcribe-receipt-image";

const { mockLmstudio } = vi.hoisted(() => ({
  mockLmstudio: vi.fn<(modelId: string) => MockLanguageModelV4>(),
}));

// @ts-expect-error mock types don't match the OpenAI-compatible provider internals
vi.mock(import("./provider"), () => ({
  LM_STUDIO_URL: "http://localhost:1234/v1",
  ORC_MODEL: "test-ocr",
  PARSE_MODEL: "test-parse",
  lmstudio: mockLmstudio,
}));

const mockResult = (text: string) => ({
  content: [{ text, type: "text" as const }],
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

const validExtraction = {
  items: [{ kind: "product", lineTotal: 10, name: "Product", quantity: 1 }],
  merchant: { name: "Test Cafe" },
  payment: { method: "card" },
  totals: { total: 10 },
  transaction: {},
};

/** The prompt as the model sees it: raw text parts joined, unescaped. */
const renderPromptText = () => {
  const model = mockLmstudio.mock.results.at(0)?.value;
  const messages = model?.doGenerateCalls?.[0]?.prompt ?? [];
  return messages
    .flatMap((message: { content?: unknown[] }) => message.content ?? [])
    .flatMap((part: unknown) =>
      part && typeof part === "object" && "text" in part
        ? [String((part as { text: unknown }).text)]
        : []
    )
    .join("\n");
};

/** The prompt serialised, for asserting on non-text parts (the image). */
const renderPromptJson = () => {
  const model = mockLmstudio.mock.results.at(0)?.value;
  return JSON.stringify(model?.doGenerateCalls?.[0]?.prompt ?? null);
};

describe(transcribeReceiptImage, () => {
  beforeEach(() => {
    mockLmstudio.mockReset();
  });

  it("returns the model's transcription text", async () => {
    mockLmstudio.mockReturnValue(
      new MockLanguageModelV4({ doGenerate: mockResult("RAW OCR") })
    );

    await expect(
      transcribeReceiptImage("aGVsbG8=", "image/jpeg", "test-ocr")
    ).resolves.toBe("RAW OCR");
  });

  it("sends the transcription prompt with the receipt image", async () => {
    mockLmstudio.mockReturnValue(
      new MockLanguageModelV4({ doGenerate: mockResult("RAW OCR") })
    );

    await transcribeReceiptImage("aGVsbG8=", "image/jpeg", "test-ocr");

    const prompt = renderPromptJson();
    expect(renderPromptText()).toContain(TRANSCRIPTION_PROMPT);
    expect(prompt).toContain("aGVsbG8=");
    expect(prompt).toContain("image/jpeg");
  });

  it("passes the requested model id through to the provider", async () => {
    mockLmstudio.mockReturnValue(
      new MockLanguageModelV4({ doGenerate: mockResult("RAW OCR") })
    );

    await transcribeReceiptImage("aGVsbG8=", "image/jpeg", "another-ocr");

    expect(mockLmstudio).toHaveBeenCalledWith("another-ocr");
  });
});

describe(parseReceiptText, () => {
  beforeEach(() => {
    mockLmstudio.mockReset();
  });

  it("returns the parsed extraction from a valid model response", async () => {
    mockLmstudio.mockReturnValue(
      new MockLanguageModelV4({
        doGenerate: mockResult(JSON.stringify(validExtraction)),
      })
    );

    await expect(parseReceiptText("SOME TRANSCRIPT")).resolves.toStrictEqual(
      validExtraction
    );
  });

  it("sends the parse prompt with the OCR transcript", async () => {
    mockLmstudio.mockReturnValue(
      new MockLanguageModelV4({
        doGenerate: mockResult(JSON.stringify(validExtraction)),
      })
    );

    await parseReceiptText("SOME TRANSCRIPT");

    const prompt = renderPromptText();
    expect(prompt).toContain(PARSE_PROMPT);
    expect(prompt).toContain("SOME TRANSCRIPT");
  });

  it("passes the requested parse model id through to the provider", async () => {
    mockLmstudio.mockReturnValue(
      new MockLanguageModelV4({
        doGenerate: mockResult(JSON.stringify(validExtraction)),
      })
    );

    await parseReceiptText("SOME TRANSCRIPT", "another-parse");

    expect(mockLmstudio).toHaveBeenCalledWith("another-parse");
  });

  it("throws when the model returns text that is not JSON", async () => {
    mockLmstudio.mockReturnValue(
      new MockLanguageModelV4({
        doGenerate: mockResult("definitely not json"),
      })
    );

    await expect(parseReceiptText("SOME TRANSCRIPT")).rejects.toBeInstanceOf(
      NoObjectGeneratedError
    );
  });

  it("throws when the model response does not satisfy the extraction contract", async () => {
    mockLmstudio.mockReturnValue(
      new MockLanguageModelV4({
        doGenerate: mockResult(JSON.stringify({ totals: { total: 10 } })),
      })
    );

    await expect(parseReceiptText("SOME TRANSCRIPT")).rejects.toBeInstanceOf(
      NoObjectGeneratedError
    );
  });
});
