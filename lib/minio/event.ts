import { z } from "zod/v4";

export const MinioEvent = z.looseObject({
  EventName: z.string(),
  Key: z.string(),
  Records: z.array(
    z.looseObject({
      awsRegion: z.string(),
      eventName: z.string(),
      eventSource: z.string(),
      eventTime: z.string(),
      eventVersion: z.string(),
      requestParameters: z.object({
        principalId: z.string(),
        region: z.string(),
        sourceIPAddress: z.string(),
      }),
      responseElements: z.object({
        "x-amz-id-2": z.string(),
        "x-amz-request-id": z.string(),
        "x-minio-deployment-id": z.string(),
        "x-minio-origin-endpoint": z.string(),
      }),
      s3: z.object({
        bucket: z.object({
          arn: z.string(),
          name: z.string(),
          ownerIdentity: z.object({
            principalId: z.string(),
          }),
        }),
        configurationId: z.string(),
        object: z.object({
          contentType: z.string().optional(),
          eTag: z.string(),
          key: z.string(),
          sequencer: z.string(),
          size: z.number(),
          userMetadata: z.record(z.string(), z.string()),
        }),
        s3SchemaVersion: z.string(),
      }),
      source: z.object({
        host: z.string(),
        port: z.string(),
        userAgent: z.string(),
      }),
      userIdentity: z.object({
        principalId: z.string(),
      }),
    })
  ),
});

export type MinioEvent = z.infer<typeof MinioEvent>;
