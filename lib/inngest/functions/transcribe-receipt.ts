import { APICallError, NoObjectGeneratedError } from "ai";
import { eq } from "drizzle-orm";
import { NonRetriableError } from "inngest";

import {
  parseReceiptText,
  transcribeReceiptImage,
} from "@/lib/ai/transcribe-receipt-image";
import { db, findReceiptById, receiptItems, receipts } from "@/lib/db";
import { ReceiptInformationExtractionSchema } from "@/lib/db/contract";
import type { ProcessingStatus } from "@/lib/db/schema/receipt";
import { receiptItemInsertSchema } from "@/lib/db/schema/receipt-item";
import { receiptChannel } from "@/lib/inngest/channels";
import { inngest } from "@/lib/inngest/client";
import { receiptDateTimeToDate } from "@/lib/inngest/helper-functions";
import { BUCKET, contentTypeFromKey, downloadObject } from "@/lib/minio/client";

const setReceiptStatus = (id: string, status: ProcessingStatus) =>
  db.update(receipts).set({ status }).where(eq(receipts.id, id));

const CENTS_EPSILON = 0.01;

const hasIntegrityMismatch = (total: number, lineTotals: number[]): boolean => {
  const lineSum = lineTotals.reduce(
    (sum, currentTotal) => sum + currentTotal,
    0
  );
  const diff = Math.abs(lineSum - total);
  return diff >= CENTS_EPSILON;
};

const itemSchema = receiptItemInsertSchema.omit({ id: true, receiptId: true });
const itemsSchema = itemSchema.array();

const MY_TIMEZONE = "Australia/Brisbane";

const formatFailureMessage = (error: Error): string => {
  if (NoObjectGeneratedError.isInstance(error)) {
    return `Model did not return valid structured output: ${error.message}`;
  }
  if (APICallError.isInstance(error)) {
    return `AI provider error: ${error.message}`;
  }
  return error.message;
};

export const transcribeReceipt = inngest.createFunction(
  {
    id: "transcribe-receipt",
    onFailure: async ({ event, step }) => {
      const { receiptId } = event.data.event.data;
      const ch = receiptChannel(receiptId);

      await step.run("mark-error", async () => {
        await setReceiptStatus(receiptId, "error");
      });

      await step.realtime.publish(`state-${receiptId}-failed`, ch.state, {
        state: "failed",
      });
    },
    triggers: [{ event: "receipt/uploaded" }],
  },
  async ({ event, step }) => {
    const { receiptId } = event.data;

    const ch = receiptChannel(receiptId);

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

    await step.realtime.publish("publish-extracting", ch.state, {
      state: "extracting",
    });

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

    await step.realtime.publish("publish-parsing", ch.state, {
      state: "parsing",
    });

    let rawExtraction;
    try {
      rawExtraction = await step.run("parsing", () =>
        parseReceiptText(transcript)
      );
    } catch (error) {
      if (APICallError.isInstance(error) && error.isRetryable) {
        // let it bubble up unwrapped -> Inngest retries the step automatically
        throw error;
      }

      throw new NonRetriableError(
        formatFailureMessage(
          error instanceof Error ? error : new Error(String(error))
        )
      );
    }

    const parsedExtraction =
      ReceiptInformationExtractionSchema.safeParse(rawExtraction);
    if (!parsedExtraction.success) {
      throw new NonRetriableError(
        `Contract validation failed: ${parsedExtraction.error.message}`
      );
    }

    const { data: extraction } = parsedExtraction;

    const validatedItems = itemsSchema.safeParse(extraction.items);
    if (!validatedItems.success) {
      throw new NonRetriableError(
        `Contract validation failed for receipt items: ${validatedItems.error.message}`
      );
    }

    const integrityWarning = hasIntegrityMismatch(
      extraction.totals.total,
      extraction.items.map((item) => item.lineTotal)
    );

    await step.realtime.publish("publish-storing", ch.state, {
      state: "storing",
    });

    await step.run("storing", async () => {
      const transactionDateTime = extraction.transaction.datetime
        ? receiptDateTimeToDate(extraction.transaction.datetime, MY_TIMEZONE)
        : undefined;

      await db
        .update(receipts)
        .set({
          hasIntegrityWarning: integrityWarning,
          merchant: extraction.merchant,
          merchantName: extraction.merchant.name,
          payment: extraction.payment,
          receiptNumber: extraction.transaction.receiptNumber,
          status: "done" as const,
          totals: extraction.totals,
          transaction: extraction.transaction,
          transactionDateTime,
        })
        .where(eq(receipts.id, receiptId));

      if (validatedItems.data.length > 0) {
        await db
          .insert(receiptItems)
          .values(validatedItems.data.map((item) => ({ ...item, receiptId })));
      }
    });

    await step.realtime.publish("publish-done", ch.state, {
      state: "done",
    });

    return { extraction, integrityWarning, receiptId };
  }
);
