import { APICallError, NoObjectGeneratedError } from "ai";
import { eq } from "drizzle-orm";
import { NonRetriableError } from "inngest";

import { isUnreachableError } from "@/lib/ai/errors";
import { LM_STUDIO_URL } from "@/lib/ai/provider";
import {
  parseReceiptText,
  transcribeReceiptImage,
} from "@/lib/ai/transcribe-receipt-image";
import { db, findReceiptById, receiptItems, receipts } from "@/lib/db";
import { ReceiptInformationExtractionSchema } from "@/lib/db/contract";
import { receiptToFlat } from "@/lib/db/receipt-mapping";
import type { ProcessingStatus } from "@/lib/db/schema/receipt";
import { receiptChannel } from "@/lib/inngest/channels";
import { inngest } from "@/lib/inngest/client";
import {
  receiptExtractedEvent,
  receiptReprocessEvent,
  receiptUploadedEvent,
} from "@/lib/inngest/events";
import { normalizeExtractedItems } from "@/lib/receipt/extraction";
import { reconcile } from "@/lib/receipt/integrity";
import { BUCKET, downloadObject } from "@/lib/storage/client";
import { contentTypeFromKey } from "@/lib/storage/content-type";

const setReceiptStatus = (id: string, status: ProcessingStatus) =>
  db.update(receipts).set({ status }).where(eq(receipts.id, id));

const formatFailureMessage = (error: Error): string => {
  if (NoObjectGeneratedError.isInstance(error)) {
    return `Model did not return valid structured output: ${error.message}`;
  }
  if (APICallError.isInstance(error)) {
    return `AI provider error: ${error.message}`;
  }
  return error.message;
};

/**
 * The status a failed run leaves behind.
 *
 * A first extraction has nothing to fall back to, so it is `error`. A
 * re-process does: the stored extraction is only replaced in the final
 * `storing` step, so any earlier failure leaves it fully intact and the receipt
 * should keep saying so. Marking it `error` instead would hide the edit form,
 * drop it out of `listDoneReceipts`, and exclude it from every spend query —
 * all because an attempt the owner did not need failed.
 */
export const statusAfterFailedRun = (
  previousStatus?: ProcessingStatus
): ProcessingStatus => previousStatus ?? "error";

export const transcribeReceipt = inngest.createFunction(
  {
    concurrency: [
      {
        key: "event.data.userId",
        limit: 2,
      },
      {
        key: "transcribe",
        limit: 2,
        scope: "account",
      },
    ],
    id: "transcribe-receipt",
    onFailure: async ({ event, step }) => {
      const trigger = event.data.event;
      const { receiptId } = trigger.data;
      const ch = receiptChannel(receiptId);
      const errorMessage = event.data.error?.message;
      const previousStatus =
        trigger.name === receiptReprocessEvent.name
          ? trigger.data.previousStatus
          : undefined;

      await step.run("mark-error", async () => {
        // `storing` writes `done` as its last act, so a receipt already `done`
        // holds the new extraction. Restoring the pre-run status over it would
        // report a failure against data that is there and correct.
        const current = await findReceiptById(receiptId);

        if (current?.status === "done") {
          return;
        }

        await setReceiptStatus(receiptId, statusAfterFailedRun(previousStatus));
      });

      await step.realtime.publish(`state-${receiptId}-failed`, ch.state, {
        error: errorMessage,
        state: "failed",
      });
    },
    triggers: [receiptUploadedEvent, receiptReprocessEvent],
  },
  async ({ event, step }) => {
    const { receiptId, userId } = event.data;

    const reprocessing = event.name === receiptReprocessEvent.name;
    const models = reprocessing ? event.data.models : undefined;

    // A re-process arrives already claimed: the server action moved the row to
    // `processing` before sending the event, and that claim is what stops two
    // requests from starting two runs against one receipt.
    const expectedStatus: ProcessingStatus = reprocessing
      ? "processing"
      : "pending";

    const ch = receiptChannel(receiptId);

    const receipt = await step.run("lookup-receipt", async () => {
      const found = await findReceiptById(receiptId);
      if (!found) {
        throw new NonRetriableError(`Receipt ${receiptId} not found`);
      }
      if (found.status !== expectedStatus) {
        throw new NonRetriableError(
          `Receipt ${receiptId} is ${found.status}, expected ${expectedStatus}`
        );
      }
      return found;
    });

    const key = receipt.objectKey;
    if (!key) {
      throw new NonRetriableError(`Receipt ${receiptId} has no objectKey`);
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

      try {
        return await transcribeReceiptImage(
          base64,
          contentTypeFromKey(key),
          models?.ocr
        );
      } catch (error) {
        if (isUnreachableError(error)) {
          throw new NonRetriableError(
            `LM Studio is not reachable at ${LM_STUDIO_URL}. Start LM Studio and try again.`
          );
        }
        throw error;
      }
    });

    await step.run("store-transcript", async () => {
      await db
        .update(receipts)
        .set({ transcript })
        .where(eq(receipts.id, receiptId));
    });

    await step.realtime.publish("publish-parsing", ch.state, {
      state: "parsing",
    });

    let rawExtraction;
    try {
      rawExtraction = await step.run("parsing", () =>
        parseReceiptText(transcript, models?.parse)
      );
    } catch (error) {
      if (isUnreachableError(error)) {
        throw new NonRetriableError(
          `LM Studio is not reachable at ${LM_STUDIO_URL}. Start LM Studio and try again.`
        );
      }
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

    const items = normalizeExtractedItems(extraction.items);

    const integrityWarning = !reconcile(items, {
      total: extraction.totals.total,
    }).matches;

    await step.realtime.publish("publish-storing", ch.state, {
      state: "storing",
    });

    await step.run("storing", async () => {
      await db.transaction(async (tx) => {
        await tx
          .update(receipts)
          .set({
            ...receiptToFlat(extraction),
            // The new items carry no categories, so the previous stamp now
            // describes a set of rows that no longer exists.
            categorizedAt: null,
            hasIntegrityWarning: integrityWarning,
            status: "done" as const,
          })
          .where(eq(receipts.id, receiptId));

        // Unconditional: a re-process replaces the stored line items, and a
        // first extraction has none to delete. A delete-then-insert rather than
        // an insert alone is what keeps a re-run from doubling every line.
        await tx
          .delete(receiptItems)
          .where(eq(receiptItems.receiptId, receiptId));

        if (items.length > 0) {
          await tx
            .insert(receiptItems)
            .values(items.map((item) => ({ ...item, receiptId })));
        }
      });
    });

    await step.realtime.publish("publish-done", ch.state, {
      state: "done",
    });

    await step.sendEvent(
      "emit-extracted",
      receiptExtractedEvent.create({ receiptId, userId })
    );

    return {
      extraction: { ...extraction, items },
      integrityWarning,
      receiptId,
    };
  }
);
