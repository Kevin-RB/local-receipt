import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { GetObjectCommandOutput } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type { AcceptedMimeType } from "./constants";

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT ?? "localhost:9000";
const MINIO_PUBLIC_ENDPOINT =
  process.env.MINIO_PUBLIC_ENDPOINT ?? MINIO_ENDPOINT;
// MinIO's root user/password double as the S3 access key / secret key for the
// SDK client. Same credentials, dual role by MinIO convention.
const MINIO_ROOT_USER = process.env.MINIO_ROOT_USER ?? "minioadmin";
const MINIO_ROOT_PASSWORD = process.env.MINIO_ROOT_PASSWORD ?? "minioadmin";

// Endpoints may be scheme-less (dev: `localhost:9000`, internal: `minio:9000`)
// or full URLs (prod public: `https://uploads.tribi.dev`). Normalize so the
// S3 client always gets a usable URL and presigned URLs carry the right scheme.
const withScheme = (endpoint: string): string =>
  /^https?:\/\//iu.test(endpoint) ? endpoint : `http://${endpoint}`;

export const BUCKET = process.env.MINIO_BUCKET ?? "receipts";

const MIME_TO_EXT = {
  "image/jpeg": "jpg",
  "image/png": "png",
} as const satisfies Record<AcceptedMimeType, string>;

const EXT_TO_MIME = {
  jpg: "image/jpeg",
  png: "image/png",
} as const;

export const extensionForMime = (mime: AcceptedMimeType): string =>
  MIME_TO_EXT[mime];

export const contentTypeFromKey = (key: string): string => {
  const ext = key.split(".").pop();
  return ext && ext in EXT_TO_MIME
    ? EXT_TO_MIME[ext as keyof typeof EXT_TO_MIME]
    : "image/jpeg";
};

export const s3Client = new S3Client({
  credentials: {
    accessKeyId: MINIO_ROOT_USER,
    secretAccessKey: MINIO_ROOT_PASSWORD,
  },
  endpoint: withScheme(MINIO_ENDPOINT),
  forcePathStyle: true,
  region: "us-east-1",
});

const s3PublicClient = new S3Client({
  credentials: {
    accessKeyId: MINIO_ROOT_USER,
    secretAccessKey: MINIO_ROOT_PASSWORD,
  },
  endpoint: withScheme(MINIO_PUBLIC_ENDPOINT),
  forcePathStyle: true,
  region: "us-east-1",
});

export const downloadObject = async ({
  bucket,
  key,
}: {
  bucket: string;
  key: string;
}): Promise<GetObjectCommandOutput["Body"]> => {
  const result = await s3Client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key })
  );
  return result.Body;
};

export const deleteObject = async ({
  bucket,
  key,
}: {
  bucket: string;
  key: string;
}): Promise<void> => {
  await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
};

export const createPresignedUrl = ({
  bucket,
  contentType,
  expiresIn,
  key,
}: {
  bucket: string;
  contentType: string;
  expiresIn: number;
  key: string;
}) =>
  getSignedUrl(
    s3PublicClient,
    new PutObjectCommand({
      Bucket: bucket,
      ContentType: contentType,
      Key: key,
    }),
    { expiresIn }
  );
