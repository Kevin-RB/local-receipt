import { describe, it, expect } from "vitest";

import { MinioEvent } from "./event";

const validBody = {
  EventName: "s3:ObjectCreated:Put",
  Key: "receipts/abc.jpg",
  Records: [
    {
      awsRegion: "",
      eventName: "s3:ObjectCreated:Put",
      eventSource: "minio:s3",
      eventTime: "2026-07-24T04:49:17.167Z",
      eventVersion: "2.0",
      requestParameters: {
        principalId: "receipt-app",
        region: "",
        sourceIPAddress: "172.18.0.1",
      },
      responseElements: {
        "x-amz-id-2":
          "dd9025bab4ad464b049177c95eb6ebf374d3b3fd1af9251148b658df7ac2e3e8",
        "x-amz-request-id": "18C523D720EC8A19",
        "x-minio-deployment-id": "4b3eca5c-438a-42dd-81ba-9c05e3f76d45",
        "x-minio-origin-endpoint": "http://172.18.0.2:9000",
      },
      s3: {
        bucket: {
          arn: "arn:aws:s3:::receipts",
          name: "receipts",
          ownerIdentity: { principalId: "receipt-app" },
        },
        configurationId: "Config",
        object: {
          contentType: "image/jpeg",
          eTag: "4544c03bb3ebfbe798bcd142b1b6d8b3",
          key: "abc.jpg",
          sequencer: "18C523D7243959FB",
          size: 1_729_944,
          userMetadata: { "content-type": "image/jpeg" },
        },
        s3SchemaVersion: "1.0",
      },
      source: {
        host: "172.18.0.1",
        port: "",
        userAgent: "Mozilla/5.0",
      },
      userIdentity: { principalId: "receipt-app" },
    },
  ],
};

describe("MinIO event schema", () => {
  it("parses a valid MinIO webhook body and extracts the object key", () => {
    const result = MinioEvent.safeParse(validBody);
    expect(result.success).toBeTruthy();
    expect(result.data?.Records[0].s3.object.key).toBe("abc.jpg");
  });

  it("returns failure for empty body", () => {
    const result = MinioEvent.safeParse({});
    expect(result.success).toBeFalsy();
  });

  it("returns failure when Records is missing", () => {
    const result = MinioEvent.safeParse({ EventName: "s3:ObjectCreated:Put" });
    expect(result.success).toBeFalsy();
  });

  it("returns failure when Records is empty array", () => {
    const result = MinioEvent.safeParse({ Records: [] });
    expect(result.success).toBeFalsy();
  });

  it("returns failure when Records structure is incomplete", () => {
    const result = MinioEvent.safeParse({ Records: [{ s3: {} }] });
    expect(result.success).toBeFalsy();
  });

  it("returns failure for null body", () => {
    const result = MinioEvent.safeParse(null);
    expect(result.success).toBeFalsy();
  });

  it("returns failure for string body", () => {
    const result = MinioEvent.safeParse("not an object");
    expect(result.success).toBeFalsy();
  });
});
