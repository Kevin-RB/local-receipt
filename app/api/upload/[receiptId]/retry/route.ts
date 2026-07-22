import { NextResponse } from "next/server";

import { findReceiptById } from "@/lib/db";
import {
  BUCKET,
  contentTypeFromKey,
  createPresignedUrl,
} from "@/lib/minio/client";

const PRESIGNED_URL_EXPIRY_SECONDS = 60 * 5;

export const POST = async (
  _request: Request,
  { params }: { params: Promise<{ receiptId: string }> }
) => {
  const { receiptId } = await params;

  const receipt = await findReceiptById(receiptId);
  if (!receipt) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }

  if (receipt.status !== "uploading") {
    return NextResponse.json(
      { error: "Can only retry uploads in uploading state" },
      { status: 400 }
    );
  }

  if (!receipt.minioObjectKey) {
    return NextResponse.json(
      { error: "Receipt has no object key" },
      { status: 400 }
    );
  }

  const uploadUrl = await createPresignedUrl({
    bucket: BUCKET,
    contentType: contentTypeFromKey(receipt.minioObjectKey),
    expiresIn: PRESIGNED_URL_EXPIRY_SECONDS,
    key: receipt.minioObjectKey,
  });

  return NextResponse.json({ receiptId, uploadUrl });
};
