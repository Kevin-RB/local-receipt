import { installImplementation } from "temporal-polyfill/shim";
import { afterAll, beforeAll, vi } from "vitest";

const datePrototype = Date.prototype as unknown as Record<string, unknown>;

// Named (not inline) so the linter doesn't strip the `undefined` value
// that stubGlobal needs to simulate the missing API.
const missingTemporal = undefined as unknown as typeof Temporal;

/**
 * Simulates an older browser with no native Temporal implementation and only
 * the polyfill installed, mirroring what the `temporal-polyfill/global`
 * imports in the client modules provide in production. Both the `Temporal`
 * global and the `Date.prototype` method added alongside it are replaced by
 * the polyfilled versions. `installImplementation` applies the implementation
 * unconditionally, unlike the evaluation-time native check in the global
 * entrypoint (which module registries may have already run while natives
 * were still present).
 */
export const simulateBrowserWithPolyfilledTemporal = () => {
  const originalMethod = datePrototype["toTemporalInstant"];

  beforeAll(() => {
    vi.stubGlobal("Temporal", missingTemporal);
    delete datePrototype["toTemporalInstant"];
    installImplementation();
  });

  afterAll(() => {
    datePrototype["toTemporalInstant"] = originalMethod;
    vi.unstubAllGlobals();
  });
};
