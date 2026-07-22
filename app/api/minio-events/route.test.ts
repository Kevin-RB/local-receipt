import { describe, it, expect } from "vitest";

import { extractKey } from "./route";

describe(extractKey, () => {
  it("extracts Key from top-level body", () => {
    expect(extractKey({ Key: "receipts/abc.jpg" })).toBe("receipts/abc.jpg");
  });

  it("extracts key from Records[0].s3.object.key", () => {
    const body = {
      Records: [
        {
          s3: {
            object: {
              key: "receipts/xyz.png",
            },
          },
        },
      ],
    };
    expect(extractKey(body)).toBe("receipts/xyz.png");
  });

  it("returns undefined for empty body", () => {
    expect(extractKey({})).toBeUndefined();
  });

  it("returns undefined when Key is not a string", () => {
    expect(extractKey({ Key: 123 })).toBeUndefined();
  });

  it("returns undefined when Records is empty array", () => {
    expect(extractKey({ Records: [] })).toBeUndefined();
  });

  it("returns undefined when Records structure is incomplete", () => {
    expect(extractKey({ Records: [{ s3: {} }] })).toBeUndefined();
  });

  it("prefers top-level Key over Records", () => {
    const body = {
      Key: "receipts/primary.jpg",
      Records: [
        {
          s3: { object: { key: "receipts/secondary.png" } },
        },
      ],
    };
    expect(extractKey(body)).toBe("receipts/primary.jpg");
  });
});
