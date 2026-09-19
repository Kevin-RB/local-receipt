import { describe, expect, it } from "vitest";

import {
  fitWithinMaxEdge,
  JPEG_QUALITY,
  MAX_LONG_EDGE,
} from "@/lib/images/compress-receipt-image";

describe("image downscale fitting", () => {
  it("leaves images within the limit untouched", () => {
    expect(fitWithinMaxEdge({ height: 600, width: 800 })).toStrictEqual({
      height: 600,
      width: 800,
    });
  });

  it("leaves an image exactly on the limit untouched", () => {
    expect(fitWithinMaxEdge({ height: 2000, width: 1000 })).toStrictEqual({
      height: 2000,
      width: 1000,
    });
  });

  it("scales a wide image down by its long edge", () => {
    expect(fitWithinMaxEdge({ height: 3000, width: 4000 })).toStrictEqual({
      height: 1500,
      width: 2000,
    });
  });

  it("scales a tall image down by its long edge", () => {
    expect(fitWithinMaxEdge({ height: 4000, width: 3000 })).toStrictEqual({
      height: 2000,
      width: 1500,
    });
  });

  it("scales a square image down", () => {
    expect(fitWithinMaxEdge({ height: 4000, width: 4000 })).toStrictEqual({
      height: 2000,
      width: 2000,
    });
  });

  it("preserves aspect ratio with rounded pixels", () => {
    expect(fitWithinMaxEdge({ height: 2222, width: 3333 })).toStrictEqual({
      height: 1333,
      width: 2000,
    });
  });

  it("never scales below one pixel", () => {
    expect(fitWithinMaxEdge({ height: 1, width: 10_000 })).toStrictEqual({
      height: 1,
      width: 2000,
    });
  });
});

describe("compression defaults", () => {
  it("uses a 2000px long edge", () => {
    expect(MAX_LONG_EDGE).toBe(2000);
  });

  it("uses a valid JPEG quality", () => {
    expect(JPEG_QUALITY).toBeGreaterThan(0);
    expect(JPEG_QUALITY).toBeLessThanOrEqual(1);
  });
});
