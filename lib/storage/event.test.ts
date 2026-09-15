import { describe, it, expect } from "vitest";

import { StorageEvent } from "./event";

// Captured verbatim from RustFS 1.0.0-rc.6
// (sha256:97171b3d…f6035) delivering a PutObject event to a webhook.
const rustFsBody = {
  EventName: "s3:ObjectCreated:Put",
  Key: "receipts/abc.jpg",
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
          key: "abc.jpg",
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
  it("parses a captured RustFS webhook body and extracts the object key", () => {
    const result = StorageEvent.safeParse(rustFsBody);
    expect(result.success).toBeTruthy();
    expect(result.data?.Records[0].s3.object.key).toBe("abc.jpg");
  });

  it("accepts a minimal body and does not require MinIO-only fields", () => {
    const result = StorageEvent.safeParse({
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
    expect(StorageEvent.safeParse({}).success).toBeFalsy();
  });

  it("returns failure when Records is missing", () => {
    expect(
      StorageEvent.safeParse({ EventName: "s3:ObjectCreated:Put" }).success
    ).toBeFalsy();
  });

  it("returns failure when Records is empty", () => {
    expect(StorageEvent.safeParse({ Records: [] }).success).toBeFalsy();
  });

  it("returns failure when the object key is missing", () => {
    expect(
      StorageEvent.safeParse({ Records: [{ s3: {} }] }).success
    ).toBeFalsy();
  });

  it("returns failure for null body", () => {
    expect(StorageEvent.safeParse(null).success).toBeFalsy();
  });

  it("returns failure for string body", () => {
    expect(StorageEvent.safeParse("not an object").success).toBeFalsy();
  });
});
