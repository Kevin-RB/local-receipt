import { afterAll, beforeAll, vi } from "vitest";

const datePrototype = Date.prototype as unknown as Record<string, unknown>;

// Named (not inline) so the linter doesn't strip the `undefined` value
// that stubGlobal needs to simulate the missing API.
const missingTemporal = undefined as unknown as typeof Temporal;

/**
 * Simulates an older browser with no native Temporal implementation and only
 * the polyfill installed, mirroring what `TemporalPolyfill` provides in
 * production. Both the `Temporal` global and the `Date.prototype` method
 * added alongside it are replaced by the polyfilled versions.
 */
export const simulateBrowserWithPolyfilledTemporal = () => {
  const originalMethod = datePrototype["toTemporalInstant"];

  beforeAll(async () => {
    vi.stubGlobal("Temporal", missingTemporal);
    delete datePrototype["toTemporalInstant"];
    await import("temporal-polyfill/global");
  });

  afterAll(() => {
    datePrototype["toTemporalInstant"] = originalMethod;
    vi.unstubAllGlobals();
  });
};
