import { z } from "zod/v4";

// RustFS percent-encodes the object key in the notification payload (slashes
// become `%2F`), so decode it before it is used to look a receipt up. Fall back
// to the raw value if it is not valid percent-encoding rather than throwing.
const decodeObjectKey = (key: string): string => {
  try {
    return decodeURIComponent(key);
  } catch {
    return key;
  }
};

// RustFS bucket-notification envelope. It follows the S3 event shape but the
// detail nodes differ from MinIO's (RustFS puts the request header map in
// `requestParameters` and omits MinIO's `x-minio-*` response elements), so we
// validate only the fields this consumer reads: the object key of the first
// record. Everything else is intentionally unvalidated.
export const storageEventSchema = z.looseObject({
  Records: z
    .array(
      z.looseObject({
        eventName: z.string(),
        s3: z.looseObject({
          object: z.looseObject({ key: z.string().transform(decodeObjectKey) }),
        }),
      })
    )
    .min(1),
});

export type StorageEvent = z.infer<typeof storageEventSchema>;
