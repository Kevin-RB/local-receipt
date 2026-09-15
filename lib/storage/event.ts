import { z } from "zod/v4";

// RustFS bucket-notification envelope. It follows the S3 event shape but the
// detail nodes differ from MinIO's (RustFS puts the request header map in
// `requestParameters` and omits MinIO's `x-minio-*` response elements), so we
// validate only the fields this consumer reads: the object key of the first
// record. Everything else is intentionally unvalidated.
export const StorageEvent = z.looseObject({
  Records: z
    .array(
      z.looseObject({
        eventName: z.string(),
        s3: z.looseObject({
          object: z.looseObject({ key: z.string() }),
        }),
      })
    )
    .min(1),
});

export type StorageEvent = z.infer<typeof StorageEvent>;
