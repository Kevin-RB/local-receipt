import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { GetObjectCommandOutput } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type { AcceptedMimeType } from "./constants";

const STORAGE_ENDPOINT = process.env.STORAGE_ENDPOINT ?? "localhost:9000";
const STORAGE_PUBLIC_ENDPOINT =
  process.env.STORAGE_PUBLIC_ENDPOINT ?? STORAGE_ENDPOINT;
// RustFS's access key and secret key are the S3 credentials for the SDK client.
const STORAGE_ACCESS_KEY = process.env.STORAGE_ACCESS_KEY ?? "rustfsadmin";
const STORAGE_SECRET_KEY = process.env.STORAGE_SECRET_KEY ?? "rustfsadmin";

// Endpoints may be scheme-less (dev: `localhost:9000`, internal: `rustfs:9000`)
// or full URLs (prod public: `https://uploads.tribi.dev`). Normalize so the
// S3 client always gets a usable URL and presigned URLs carry the right scheme.
const withScheme = (endpoint: string): string =>
  /^https?:\/\//iu.test(endpoint) ? endpoint : `http://${endpoint}`;

export const BUCKET = process.env.STORAGE_BUCKET ?? "receipts";

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
    accessKeyId: STORAGE_ACCESS_KEY,
    secretAccessKey: STORAGE_SECRET_KEY,
  },
  endpoint: withScheme(STORAGE_ENDPOINT),
  forcePathStyle: true,
  region: "us-east-1",
});

const s3PublicClient = new S3Client({
  credentials: {
    accessKeyId: STORAGE_ACCESS_KEY,
    secretAccessKey: STORAGE_SECRET_KEY,
  },
  endpoint: withScheme(STORAGE_PUBLIC_ENDPOINT),
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
