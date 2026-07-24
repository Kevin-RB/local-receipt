import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod/v4";

import { db, receipts } from "@/lib/db";
import {
  BUCKET,
  createPresignedUrl,
  extensionForMime,
} from "@/lib/minio/client";
import { ACCEPTED_MIME_TYPES } from "@/lib/minio/constants";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const PRESIGNED_URL_EXPIRY_SECONDS = 60 * 5;

const UploadRequest = z.object({
  contentType: z.enum(ACCEPTED_MIME_TYPES, {
    error: "Unsupported content type",
  }),
  fileSize: z
    .number({ error: "fileSize must be a number" })
    .int({ error: "fileSize must be an integer" })
    .positive({ error: "fileSize must be > 0" })
    .max(MAX_FILE_SIZE, { error: `fileSize must be <= ${MAX_FILE_SIZE}` }),
});

export const POST = async (request: Request) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const parsed = UploadRequest.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
      { status: 400 }
    );
  }

  const { contentType } = parsed.data;

  const receiptId = randomUUID();
  const ext = extensionForMime(contentType);
  const objectKey = `${receiptId}.${ext}`;

  await db.insert(receipts).values({
    id: receiptId,
    minioObjectKey: objectKey,
    status: "uploading",
  });

  const uploadUrl = await createPresignedUrl({
    bucket: BUCKET,
    contentType,
    expiresIn: PRESIGNED_URL_EXPIRY_SECONDS,
    key: objectKey,
  });

  return NextResponse.json({ receiptId, uploadUrl });
};
