import { beforeEach, describe, expect, it, vi } from "vitest";

import { listAvailableModels } from "./models";

const mockFetch = vi.hoisted(() => vi.fn<() => Promise<Response>>());

vi.stubGlobal("fetch", mockFetch);

const jsonResponse = (body: unknown, ok = true) =>
  ({
    json: () => Promise.resolve(body),
    ok,
  }) as Response;

describe(listAvailableModels, () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("returns the ids LM Studio reports, without duplicates", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        data: [
          { id: "glm-ocr" },
          { id: "google/gemma-4-e4b" },
          { id: "glm-ocr" },
        ],
      })
    );

    await expect(listAvailableModels()).resolves.toStrictEqual([
      "glm-ocr",
      "google/gemma-4-e4b",
    ]);
  });

  it("returns an empty list when the provider reports an error", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ error: "nope" }, false));

    await expect(listAvailableModels()).resolves.toStrictEqual([]);
  });

  it("returns an empty list when the provider is unreachable", async () => {
    mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(listAvailableModels()).resolves.toStrictEqual([]);
  });

  it("returns an empty list when the response has no model array", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: "not-an-array" }));

    await expect(listAvailableModels()).resolves.toStrictEqual([]);
  });

  it("returns an empty list when a model entry has no id", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: [{ nope: true }] }));

    await expect(listAvailableModels()).resolves.toStrictEqual([]);
  });
});
