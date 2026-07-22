import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, findReceiptByObjectKey, receipts } from "@/lib/db";
import { inngest } from "@/lib/inngest/client";

const { MINIO_WEBHOOK_SECRET } = process.env;

export const extractKey = (
  body: Record<string, unknown>
): string | undefined => {
  if (typeof body.Key === "string") {
    return body.Key;
  }

  const records = body.Records;
  if (Array.isArray(records) && records.length > 0) {
    const first = records[0] as Record<string, unknown> | undefined;
    const s3 = first?.s3 as Record<string, unknown> | undefined;
    const object = s3?.object as Record<string, unknown> | undefined;
    if (typeof object?.key === "string") {
      return object.key;
    }
  }

  return undefined;
};

export const POST = async (request: Request) => {
  const auth = request.headers.get("authorization");
  const expectedToken = MINIO_WEBHOOK_SECRET
    ? `Bearer ${MINIO_WEBHOOK_SECRET}`
    : undefined;

  if (expectedToken && auth !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const key = extractKey(body);
  if (!key) {
    return NextResponse.json(
      { error: "Could not extract object key from event" },
      { status: 400 }
    );
  }

  const receipt = await findReceiptByObjectKey(key);
  if (!receipt || receipt.status !== "uploading") {
    return NextResponse.json({ received: true });
  }

  await db
    .update(receipts)
    .set({ status: "pending" })
    .where(eq(receipts.id, receipt.id));

  await inngest.send({
    data: { receiptId: receipt.id },
    name: "receipt/uploaded",
  });

  return NextResponse.json({ received: true });
};
