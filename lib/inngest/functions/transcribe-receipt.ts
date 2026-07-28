import { APICallError, NoObjectGeneratedError } from "ai";
import { eq } from "drizzle-orm";
import { NonRetriableError } from "inngest";

import {
  parseReceiptText,
  transcribeReceiptImage,
} from "@/lib/ai/transcribe-receipt-image";
import { db, findReceiptById, receiptItems, receipts } from "@/lib/db";
import type { ProcessingStatus, ReceiptExtraction } from "@/lib/db";
import {
  receiptExtractionSelectSchema,
  receiptUpdateSchema,
} from "@/lib/db/schema/receipt";
import { receiptItemInsertSchema } from "@/lib/db/schema/receipt-item";
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

    const ch = receiptChannel({ receiptId });

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

    await step.realtime.publish(`state-${receiptId}-extracting`, ch.state, {
      state: "extracting",
      ts: Date.now(),
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

    await step.realtime.publish(`state-${receiptId}-parsing`, ch.state, {
      state: "parsing",
      ts: Date.now(),
    });

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

      await step.realtime.publish(`state-${receiptId}-failed`, ch.state, {
        error: message,
        state: "failed",
        ts: Date.now(),
      });

      throw new NonRetriableError(message);
    }

    const integrityWarning = hasIntegrityMismatch(extraction);

    const validated = receiptExtractionSelectSchema.safeParse({
      merchant: extraction.merchant,
      payment: extraction.payment,
      totals: extraction.totals,
      transaction: extraction.transaction,
    });
    if (!validated.success) {
      const message = `Contract validation failed: ${validated.error.message}`;
      await step.realtime.publish(`state-${receiptId}-failed`, ch.state, {
        error: message,
        state: "failed",
        ts: Date.now(),
      });
      throw new NonRetriableError(message);
    }

    const { data } = validated;

    await step.run("storing", async () => {
      const updatePayload = {
        hasIntegrityWarning: integrityWarning,
        merchant: data.merchant,
        merchantName: data.merchant.name,
        payment: data.payment,
        receiptNumber: data.transaction.receipt_number,
        status: "done" as const,
        totals: data.totals,
        transaction: data.transaction,
        transactionDateTime: data.transaction.datetime
          ? new Date(data.transaction.datetime)
          : undefined,
      };

      const updateValidated = receiptUpdateSchema.safeParse(updatePayload);

      if (!updateValidated.success) {
        throw new NonRetriableError(
          `Update payload validation failed: ${updateValidated.error.message}`
        );
      }

      await db
        .update(receipts)
        .set(updatePayload)
        .where(eq(receipts.id, receiptId));

      if (extraction.items.length > 0) {
        const itemsPayload = extraction.items.map((item) => ({
          lineTotal: item.line_total.toString(),
          name: item.name,
          quantity: item.quantity?.toString(),
          receiptId,
          unitPrice: item.unit_price?.toString(),
        }));

        for (const item of itemsPayload) {
          const itemValidated = receiptItemInsertSchema.safeParse(item);
          if (!itemValidated.success) {
            throw new NonRetriableError(
              `Item validation failed: ${itemValidated.error.message}`
            );
          }
        }

        await db.insert(receiptItems).values(itemsPayload);
      }
    });

    const receiptPayload = {
      hasIntegrityWarning: integrityWarning,
      items: extraction.items.map((item) => ({
        line_total: item.line_total,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })),
      merchant: data.merchant,
      payment: data.payment,
      receiptNumber: data.transaction.receipt_number,
      totals: data.totals,
      transactionDateTime: data.transaction.datetime,
    };

    await step.realtime.publish(`state-${receiptId}-complete`, ch.state, {
      receipt: receiptPayload,
      state: "complete",
      ts: Date.now(),
    });

    return { extraction, integrityWarning, receiptId };
  }
);
