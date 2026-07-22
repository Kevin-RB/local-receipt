import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT ?? "localhost:9000";
const MINIO_ROOT_USER = process.env.MINIO_ROOT_USER ?? "minioadmin";
const MINIO_ROOT_PASSWORD = process.env.MINIO_ROOT_PASSWORD ?? "minioadmin";
const MINIO_USE_SSL = process.env.MINIO_USE_SSL === "true";

export const BUCKET = process.env.MINIO_BUCKET ?? "receipts";

export const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png"] as const;

type AcceptedMimeType = (typeof ACCEPTED_MIME_TYPES)[number];

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
  endpoint: MINIO_USE_SSL
    ? `https://${MINIO_ENDPOINT}`
    : `http://${MINIO_ENDPOINT}`,
  forcePathStyle: true,
  region: "us-east-1",
});

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
    s3Client,
    new PutObjectCommand({
      Bucket: bucket,
      ContentType: contentType,
      Key: key,
    }),
    { expiresIn }
  );
