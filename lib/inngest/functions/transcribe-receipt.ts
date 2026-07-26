import { eq } from "drizzle-orm";
import { NonRetriableError } from "inngest";

import { transcribeReceiptImage } from "@/lib/ai/transcribe-receipt-image";
import { db, findReceiptById, receipts } from "@/lib/db";
import type { ProcessingStatus } from "@/lib/db";
import { inngest } from "@/lib/inngest/client";
import { BUCKET, contentTypeFromKey, downloadObject } from "@/lib/minio/client";

const setReceiptStatus = (id: string, status: ProcessingStatus) =>
  db.update(receipts).set({ status }).where(eq(receipts.id, id));

export const transcribeReceipt = inngest.createFunction(
  {
    id: "transcribe-receipt",
    triggers: [{ event: "receipt/uploaded" }],
  },
  async ({ event, step }) => {
    const { receiptId } = event.data;

    const receipt = await step.run("lookup-receipt", async () => {
      const found = await findReceiptById(receiptId);
      if (!found) {
        throw new NonRetriableError(`Receipt ${receiptId} not found`);
      }
      if (found.status !== "pending") {
        throw new NonRetriableError(
          `Receipt ${receiptId} is ${found.status}, expected pending`
        );
      }
      return found;
    });

    const key = receipt.minioObjectKey;
    if (!key) {
      throw new NonRetriableError(`Receipt ${receiptId} has no minioObjectKey`);
    }

    await step.run("mark-processing", async () => {
      await setReceiptStatus(receiptId, "processing");
    });

    const transcript = await step.run("transcribe-receipt-image", async () => {
      const body = await downloadObject({
        bucket: BUCKET,
        key,
      });
      if (!body) {
        throw new NonRetriableError(`Empty body for object ${key}`);
      }
      const base64 = await body.transformToString("base64");
      return transcribeReceiptImage(base64, contentTypeFromKey(key));
    });

    return { receiptId, transcript };
  }
);
