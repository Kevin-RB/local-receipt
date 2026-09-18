import { afterEach, describe, expect, it, vi } from "vitest";

import {
  contentTypeFromKey,
  extensionForMime,
  presignEndpointForHost,
} from "./client";
import { ACCEPTED_MIME_TYPES } from "./constants";

describe("MIME type mapping", () => {
  it("ACCEPTED_MIME_TYPES includes JPEG and PNG", () => {
    expect(ACCEPTED_MIME_TYPES).toStrictEqual(["image/jpeg", "image/png"]);
  });

  it("extensionForMime maps image/jpeg to jpg", () => {
    expect(extensionForMime("image/jpeg")).toBe("jpg");
  });

  it("extensionForMime maps image/png to png", () => {
    expect(extensionForMime("image/png")).toBe("png");
  });

  it("contentTypeFromKey returns image/jpeg for .jpg extension", () => {
    expect(contentTypeFromKey("receipts/abc.jpg")).toBe("image/jpeg");
  });

  it("contentTypeFromKey returns image/png for .png extension", () => {
    expect(contentTypeFromKey("receipts/xyz.png")).toBe("image/png");
  });

  it("contentTypeFromKey defaults to image/jpeg for unknown extension", () => {
    expect(contentTypeFromKey("receipts/file.txt")).toBe("image/jpeg");
  });

  it("contentTypeFromKey defaults to image/jpeg for key without extension", () => {
    expect(contentTypeFromKey("receipts/file")).toBe("image/jpeg");
  });
});

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
