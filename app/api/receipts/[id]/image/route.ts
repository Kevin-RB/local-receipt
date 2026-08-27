import { NextResponse } from "next/server";
import { z } from "zod/v4";

import { auth } from "@/lib/auth";
import { findReceiptByIdForOwner } from "@/lib/db";
import { BUCKET, contentTypeFromKey, downloadObject } from "@/lib/minio/client";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export const GET = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = paramsSchema.parse(await params);
  const receipt = await findReceiptByIdForOwner(id, session.user.id);

  if (!receipt?.minioObjectKey) {
    return NextResponse.json(
      { error: "Receipt image not found" },
      { status: 404 }
    );
  }

  const body = await downloadObject({
    bucket: BUCKET,
    key: receipt.minioObjectKey,
  });

  if (!body) {
    return NextResponse.json(
      { error: "Receipt image not found" },
      { status: 404 }
    );
  }

  const bytes = await body.transformToByteArray();
  const imageBlob = new Blob([Buffer.from(bytes)], {
    type: contentTypeFromKey(receipt.minioObjectKey),
  });

  return new Response(imageBlob, {
    headers: {
      "Cache-Control": "private, max-age=300",
      "Content-Type": contentTypeFromKey(receipt.minioObjectKey),
    },
  });
};
