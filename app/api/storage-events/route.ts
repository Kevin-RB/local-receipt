import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, findReceiptByObjectKey, receipts } from "@/lib/db";
import { inngest } from "@/lib/inngest/client";
import { storageEventSchema } from "@/lib/storage/event";

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

  const parsed = storageEventSchema.safeParse(body);

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

  // Redelivery is expected: RustFS retries until it gets a 2xx, and a previous
  // attempt may have promoted the row but failed to enqueue. `uploading` (first
  // delivery) and `pending` (retry before the workflow starts) are actionable;
  // anything further along (processing/done/error) is ignored.
  const promoted = receipt.status === "uploading";

  if (promoted) {
    await db
      .update(receipts)
      .set({ status: "pending" })
      .where(eq(receipts.id, receipt.id));
  } else if (receipt.status !== "pending") {
    console.warn(
      "storage-events: receipt %s is %s — ignored",
      receipt.id,
      receipt.status
    );
    return NextResponse.json({ received: true });
  }

  try {
    // The event `id` is deterministic, so re-sending after a failed attempt is
    // deduped by Inngest instead of starting a second run.
    await inngest.send({
      data: { receiptId: receipt.id, userId: receipt.userId },
      id: `receipt-uploaded-${receipt.id}`,
      name: "receipt/uploaded",
    });
  } catch (error) {
    // Non-2xx makes RustFS redeliver; the retry takes the `pending` path above
    // and re-sends rather than silently losing the extraction.
    console.error(
      "storage-events: inngest.send failed for receipt %s — will retry",
      receipt.id,
      error
    );
    return NextResponse.json(
      { error: "Failed to enqueue extraction" },
      { status: 500 }
    );
  }

  console.log(
    "storage-events: receipt %s %s",
    receipt.id,
    promoted ? "promoted uploading → pending" : "re-enqueued"
  );

  return NextResponse.json({ received: true });
};
