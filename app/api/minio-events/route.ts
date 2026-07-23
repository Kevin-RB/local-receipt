import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, findReceiptByObjectKey, receipts } from "@/lib/db";
import { inngest } from "@/lib/inngest/client";
import { parseMinioEvent } from "@/lib/minio/event";

const { MINIO_WEBHOOK_SECRET } = process.env;

export const POST = async (request: Request) => {
  const auth = request.headers.get("authorization");
  const expectedToken = MINIO_WEBHOOK_SECRET
    ? `Bearer ${MINIO_WEBHOOK_SECRET}`
    : undefined;

  if (expectedToken && auth !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const key = parseMinioEvent(body);
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
