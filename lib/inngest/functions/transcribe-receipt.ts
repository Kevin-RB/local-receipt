import { APICallError, NoObjectGeneratedError } from "ai";
import { eq } from "drizzle-orm";
import { NonRetriableError } from "inngest";

import {
  parseReceiptText,
  transcribeReceiptImage,
} from "@/lib/ai/transcribe-receipt-image";
import { db, findReceiptById, receipts } from "@/lib/db";
import type { ProcessingStatus, ReceiptExtraction } from "@/lib/db";
import { receiptExtractionSelectSchema } from "@/lib/db/schema";
import { receiptChannel } from "@/lib/inngest/channels";
import { inngest } from "@/lib/inngest/client";
import { BUCKET, contentTypeFromKey, downloadObject } from "@/lib/minio/client";

const setReceiptStatus = (id: string, status: ProcessingStatus) =>
  db.update(receipts).set({ status }).where(eq(receipts.id, id));

const CENTS_EPSILON = 0.01;

const hasIntegrityMismatch = (extraction: ReceiptExtraction): boolean => {
  const lineSum = extraction.items.reduce(
    (sum, item) => sum + item.line_total,
    0
  );
  const diff = Math.abs(lineSum - extraction.totals.total);
  return diff >= CENTS_EPSILON;
};

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

    await step.realtime.publish(
      `state-${receiptId}-extracting`,
      receiptChannel(receiptId).state,
      { state: "extracting", ts: Date.now() }
    );

    const transcript = await step.run("extracting", async () => {
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

    await step.realtime.publish(
      `state-${receiptId}-parsing`,
      receiptChannel(receiptId).state,
      { state: "parsing", ts: Date.now() }
    );

    let extraction: ReceiptExtraction;
    try {
      extraction = await step.run("parsing", () =>
        parseReceiptText(transcript)
      );
    } catch (error) {
      const baseMessage =
        error instanceof Error ? error.message : "Parse extraction failed";
      let message = baseMessage;
      if (NoObjectGeneratedError.isInstance(error)) {
        message = `Model did not return valid structured output: ${baseMessage}`;
      } else if (APICallError.isInstance(error)) {
        message = `AI provider error: ${baseMessage}`;
      }
      await step.realtime.publish(
        `state-${receiptId}-failed`,
        receiptChannel(receiptId).state,
        { error: message, state: "failed", ts: Date.now() }
      );
      throw new NonRetriableError(message);
    }

    const integrityWarning = hasIntegrityMismatch(extraction);

    let validatedExtraction;
    try {
      validatedExtraction = receiptExtractionSelectSchema.parse({
        items: extraction.items,
        merchant: extraction.merchant,
        payment: extraction.payment,
        totals: extraction.totals,
        transaction: extraction.transaction,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? `Contract validation failed: ${error.message}`
          : "Contract validation failed";
      await step.realtime.publish(
        `state-${receiptId}-failed`,
        receiptChannel(receiptId).state,
        { error: message, state: "failed", ts: Date.now() }
      );
      throw new NonRetriableError(message);
    }

    await step.run("storing", async () => {
      await db
        .update(receipts)
        .set({
          hasIntegrityWarning: integrityWarning,
          ...validatedExtraction,
          status: "done",
        })
        .where(eq(receipts.id, receiptId));
    });

    await step.realtime.publish(
      `state-${receiptId}-complete`,
      receiptChannel(receiptId).state,
      { state: "complete", ts: Date.now() }
    );

    return { extraction, integrityWarning, receiptId };
  }
);
