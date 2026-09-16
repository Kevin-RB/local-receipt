import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, findReceiptByObjectKey, receipts } from "@/lib/db";
import { inngest } from "@/lib/inngest/client";
import { StorageEvent } from "@/lib/storage/event";

const { STORAGE_WEBHOOK_SECRET } = process.env;

const BODY_PREVIEW_LENGTH = 200;

export const POST = async (request: Request) => {
  const auth = request.headers.get("authorization");
  const expectedToken = STORAGE_WEBHOOK_SECRET
    ? `Bearer ${STORAGE_WEBHOOK_SECRET}`
    : undefined;

  if (expectedToken && auth !== expectedToken) {
    console.warn("storage-events: rejected — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    console.warn("storage-events: rejected — invalid JSON body");
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const parsed = StorageEvent.safeParse(body);

  if (!parsed.success) {
    console.error(
      "storage-events: parse failed — %s | body: %s",
      JSON.stringify(parsed.error.issues),
      JSON.stringify(body).slice(0, BODY_PREVIEW_LENGTH)
    );
    return NextResponse.json(
      { error: "Invalid event format" },
      { status: 400 }
    );
  }

  const { key } = parsed.data.Records[0].s3.object;

  if (!key) {
    console.warn("storage-events: event has an empty object key — ignored");
    return NextResponse.json({ received: true });
  }

  const receipt = await findReceiptByObjectKey(key);

  if (!receipt) {
    console.warn("storage-events: no receipt for key %s — ignored", key);
    return NextResponse.json({ received: true });
  }

  if (receipt.status !== "uploading") {
    console.warn(
      "storage-events: receipt %s is %s, not uploading — ignored",
      receipt.id,
      receipt.status
    );
    return NextResponse.json({ received: true });
  }

  await db
    .update(receipts)
    .set({ status: "pending" })
    .where(eq(receipts.id, receipt.id));

  await inngest.send({
    data: { receiptId: receipt.id, userId: receipt.userId },
    id: `receipt-uploaded-${receipt.id}`,
    name: "receipt/uploaded",
  });

  console.log("storage-events: receipt %s uploading → pending", receipt.id);

  return NextResponse.json({ received: true });
};
