import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { db, receipts } from "@/lib/db";
import {
  ACCEPTED_MIME_TYPES,
  BUCKET,
  createPresignedUrl,
  extensionForMime,
} from "@/lib/minio/client";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

type AcceptedMimeType = (typeof ACCEPTED_MIME_TYPES)[number];

const PRESIGNED_URL_EXPIRY_SECONDS = 60 * 5;

export const POST = async (request: Request) => {
  let contentType: string;
  let fileSize: number;

  try {
    const body = (await request.json()) as {
      contentType: string;
      fileSize: number;
    };

    ({ contentType, fileSize } = body);
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  if (!(ACCEPTED_MIME_TYPES as readonly string[]).includes(contentType)) {
    return NextResponse.json(
      { error: "Only JPEG and PNG images are accepted" },
      { status: 400 }
    );
  }

  if (typeof fileSize !== "number" || fileSize <= 0) {
    return NextResponse.json({ error: "Invalid file size" }, { status: 400 });
  }

  if (fileSize > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File size must not exceed 5 MB" },
      { status: 400 }
    );
  }

  const receiptId = randomUUID();
  const ext = extensionForMime(contentType as AcceptedMimeType);
  const objectKey = `receipts/${receiptId}.${ext}`;

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
