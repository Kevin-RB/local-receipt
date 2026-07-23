import { z } from "zod/v4";

/**
 * MinIO sends bucket notifications in one of two shapes:
 *
 *  1. Flat (MinIO legacy): `{ EventName, Key }`
 *  2. S3-compatible:       `{ Records: [{ eventName, s3: { object: { key } } }] }`
 *
 * They share no discriminator field, so we parse with a union of two Zod schemas
 * rather than a tagged discriminated union.
 */

const FlatEvent = z.object({
  EventName: z.string().optional(),
  Key: z.string(),
});

const Record = z.object({
  eventName: z.string().optional(),
  s3: z
    .object({
      bucket: z.object({ name: z.string().optional() }).optional(),
      object: z.object({ key: z.string() }).optional(),
    })
    .optional(),
});

const RecordsEvent = z.object({
  Records: z.array(Record),
});

export const parseMinioEvent = (body: unknown): string | undefined => {
  const flat = FlatEvent.safeParse(body);
  if (flat.success) {
    return flat.data.Key;
  }

  const records = RecordsEvent.safeParse(body);
  if (records.success && records.data.Records.length > 0) {
    return records.data.Records[0]?.s3?.object?.key;
  }

  return undefined;
};
