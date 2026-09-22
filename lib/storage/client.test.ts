import { afterEach, describe, expect, it, vi } from "vitest";

import { presignEndpointForHost } from "./client";

describe(presignEndpointForHost, () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("derives the storage host from the request host in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(presignEndpointForHost("kevin:3000")).toBe("kevin:9000");
    expect(presignEndpointForHost("localhost:3000")).toBe("localhost:9000");
  });

  it("falls back to the configured endpoint without a request host", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(presignEndpointForHost(null)).toBe("localhost:9000");
  });

  it("keeps the configured endpoint outside development", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(presignEndpointForHost("kevin:3000")).toBe("localhost:9000");
  });
});
