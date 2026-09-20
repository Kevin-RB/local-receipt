import { describe, it, expect } from "vitest";

import { storageEventSchema } from "./event";

// Captured from staging: RustFS percent-encodes the object key in the payload
// (slashes become %2F), so the schema must decode it back before lookup.
const encodedKey =
  "users%2FscOggddDQHY3HYGOJSYtPAEsjzD5Lkft%2Feed199a9-f8c8-41bc-aff6-2d544eda88f5.png";
const decodedKey =
  "users/scOggddDQHY3HYGOJSYtPAEsjzD5Lkft/eed199a9-f8c8-41bc-aff6-2d544eda88f5.png";

// Captured verbatim from RustFS 1.0.0-rc.6
// (sha256:97171b3d…f6035) delivering a PutObject event to a webhook.
const rustFsBody = {
  EventName: "s3:ObjectCreated:Put",
  Key: `receipts/${encodedKey}`,
  Records: [
    {
      awsRegion: "",
      eventName: "s3:ObjectCreated:Put",
      eventSource: "rustfs:s3",
      eventTime: "2026-09-15T02:57:20.191Z",
      eventVersion: "2.1",
      requestParameters: {
        accept: "*/*",
        "accept-encoding": "gzip, deflate",
        "accept-language": "*",
        connection: "keep-alive",
        "content-length": "6",
        "content-type": "image/jpeg",
        host: "localhost:19000",
        origin: "http://localhost:3000",
        principalId: "rustfsadmin",
        "sec-fetch-mode": "cors",
        "user-agent": "node",
        "x-request-id": "d590347b-c393-4574-98c8-9dc7be7a8053",
      },
      responseElements: {
        "x-amz-id-2": "",
        "x-amz-request-id": "d590347b-c393-4574-98c8-9dc7be7a8053",
      },
      s3: {
        bucket: {
          arn: "arn:aws:s3:::receipts",
          name: "receipts",
          ownerIdentity: { principalId: "rustfsadmin" },
        },
        configurationId: "Config",
        object: {
          contentType: "image/jpeg",
          eTag: "86de41916cffa4d8fbab89629cef063f",
          key: encodedKey,
          sequencer: "18D55F252B06B1FA",
          size: 6,
          userMetadata: { "content-type": "image/jpeg" },
        },
        s3SchemaVersion: "1.0",
      },
      source: { host: "localhost:19000", port: "19000", userAgent: "node" },
      userIdentity: { principalId: "rustfsadmin" },
    },
  ],
};

describe("RustFS event schema", () => {
  it("decodes the percent-encoded object key from a captured RustFS body", () => {
    const result = storageEventSchema.safeParse(rustFsBody);
    expect(result.success).toBeTruthy();
    expect(result.data?.Records[0].s3.object.key).toBe(decodedKey);
  });

  it("leaves an unencoded key unchanged and ignores MinIO-only fields", () => {
    const result = storageEventSchema.safeParse({
      Records: [
        {
          eventName: "s3:ObjectCreated:Put",
          s3: { object: { key: "abc.jpg" } },
        },
      ],
    });
    expect(result.success).toBeTruthy();
    expect(result.data?.Records[0].s3.object.key).toBe("abc.jpg");
  });

  it("returns failure for empty body", () => {
    expect(storageEventSchema.safeParse({}).success).toBeFalsy();
  });

  it("returns failure when Records is missing", () => {
    expect(
      storageEventSchema.safeParse({ EventName: "s3:ObjectCreated:Put" })
        .success
    ).toBeFalsy();
  });

  it("returns failure when Records is empty", () => {
    expect(storageEventSchema.safeParse({ Records: [] }).success).toBeFalsy();
  });

  it("returns failure when the object key is missing", () => {
    expect(
      storageEventSchema.safeParse({ Records: [{ s3: {} }] }).success
    ).toBeFalsy();
  });

  it("returns failure for null body", () => {
    expect(storageEventSchema.safeParse(null).success).toBeFalsy();
  });

  it("returns failure for string body", () => {
    expect(storageEventSchema.safeParse("not an object").success).toBeFalsy();
  });
});
