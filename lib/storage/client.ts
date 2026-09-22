import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { GetObjectCommandOutput } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export { contentTypeFromKey, extensionForMime } from "./content-type";

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

const createS3Client = (endpoint: string) =>
  new S3Client({
    credentials: {
      accessKeyId: STORAGE_ACCESS_KEY,
      secretAccessKey: STORAGE_SECRET_KEY,
    },
    endpoint: withScheme(endpoint),
    forcePathStyle: true,
    region: "us-east-1",
  });

export const s3Client = createS3Client(STORAGE_ENDPOINT);

const s3PublicClient = createS3Client(STORAGE_PUBLIC_ENDPOINT);

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

// The presigned URL's host is part of its signature, so it must name a host the
// browser can resolve. In local development the browser reaches storage on the
// same hostname it used for the app (just a different port), so derive it from
// the request host. Every other environment — staging and production — keeps
// the configured public endpoint (e.g. the Traefik-fronted uploads host).
export const presignEndpointForHost = (host: string | null): string => {
  if (process.env.NODE_ENV !== "development" || !host) {
    return STORAGE_PUBLIC_ENDPOINT;
  }

  const port = new URL(withScheme(STORAGE_PUBLIC_ENDPOINT)).port || "9000";
  return `${host.split(":")[0]}:${port}`;
};

export const createPresignedUrl = ({
  bucket,
  contentType,
  endpoint = STORAGE_PUBLIC_ENDPOINT,
  expiresIn,
  key,
}: {
  bucket: string;
  contentType: string;
  endpoint?: string;
  expiresIn: number;
  key: string;
}) =>
  getSignedUrl(
    endpoint === STORAGE_PUBLIC_ENDPOINT
      ? s3PublicClient
      : createS3Client(endpoint),
    new PutObjectCommand({
      Bucket: bucket,
      ContentType: contentType,
      Key: key,
    }),
    { expiresIn }
  );
