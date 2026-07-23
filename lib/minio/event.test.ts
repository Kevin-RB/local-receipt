import { describe, it, expect } from "vitest";

import { parseMinioEvent } from "./event";

describe(parseMinioEvent, () => {
  it("extracts Key from flat MinIO event body", () => {
    expect(parseMinioEvent({ Key: "receipts/abc.jpg" })).toBe(
      "receipts/abc.jpg"
    );
  });

  it("extracts key from Records[0].s3.object.key", () => {
    expect(
      parseMinioEvent({
        Records: [
          {
            s3: {
              object: {
                key: "receipts/xyz.png",
              },
            },
          },
        ],
      })
    ).toBe("receipts/xyz.png");
  });

  it("returns undefined for empty body", () => {
    expect(parseMinioEvent({})).toBeUndefined();
  });

  it("returns undefined when Key is not a string", () => {
    expect(parseMinioEvent({ Key: 123 })).toBeUndefined();
  });

  it("returns undefined when Records is empty array", () => {
    expect(parseMinioEvent({ Records: [] })).toBeUndefined();
  });

  it("returns undefined when Records structure is incomplete", () => {
    expect(parseMinioEvent({ Records: [{ s3: {} }] })).toBeUndefined();
  });

  it("prefers flat Key over Records", () => {
    expect(
      parseMinioEvent({
        Key: "receipts/primary.jpg",
        Records: [
          {
            s3: { object: { key: "receipts/secondary.png" } },
          },
        ],
      })
    ).toBe("receipts/primary.jpg");
  });

  it("returns undefined for null body", () => {
    expect(parseMinioEvent(null)).toBeUndefined();
  });

  it("returns undefined for string body", () => {
    expect(parseMinioEvent("not an object")).toBeUndefined();
  });
});
