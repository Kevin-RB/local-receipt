"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { listAvailableModels } from "@/lib/ai/models";
import { ORC_MODEL, PARSE_MODEL } from "@/lib/ai/provider";
import { auth } from "@/lib/auth";
import { db, receipts } from "@/lib/db";
import { inngest } from "@/lib/inngest/client";
import { receiptReprocessEvent } from "@/lib/inngest/events";
import { BUCKET, deleteObject } from "@/lib/storage/client";

import { reprocessReceiptSchema } from "./schema";

export const deleteReceipt = async (receiptId: string) => {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return { error: "Receipt not found", success: false as const };
  }

  const existing = await db.query.receipts.findFirst({
    where: { id: receiptId, userId: session.user.id },
  });

  if (!existing) {
    return { error: "Receipt not found", success: false as const };
  }

  try {
    if (existing.objectKey) {
      await deleteObject({ bucket: BUCKET, key: existing.objectKey });
    }

    await db.delete(receipts).where(eq(receipts.id, receiptId));
  } catch {
    return { error: "Failed to delete receipt", success: false as const };
  }

  revalidatePath("/");

  return { success: true as const };
};

/**
 * The models the re-process picker offers: exactly what the provider reports,
 * since a model it has not loaded would only fail at request time.
 *
 * An empty list means the provider could not be asked, and the dialog says so
 * rather than filling the select with models the trigger would refuse — the
 * action rejects the run outright in that case, because nothing can run without
 * the provider.
 *
 * Server actions are HTTP endpoints, so this one is as reachable as any other
 * without a session. It answers with the ids the model server has loaded and the
 * models this app is configured to use, which is not an anonymous answer, so an
 * unauthenticated caller gets an empty list rather than either.
 */
export const listExtractionModels = async () => {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return { available: [], defaults: { ocr: "", parse: "" } };
  }

  return {
    available: await listAvailableModels(),
    defaults: { ocr: ORC_MODEL, parse: PARSE_MODEL },
  };
};

/**
 * Runs extraction again over a stored receipt.
 *
 * The claim is a single conditional update: only a receipt that is `done` or
 * `error` can move to `processing`, and the row coming back is what proves this
 * request was the one that moved it. Two rapid clicks therefore cannot start two
 * runs against one receipt — the second finds nothing to claim.
 *
 * If the run cannot be enqueued the claim is handed back, because a receipt
 * left in `processing` with nothing running is indistinguishable from one that
 * is genuinely mid-run.
 */
export const reprocessReceipt = async (input: unknown) => {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return { error: "Receipt not found", success: false as const };
  }

  const parsed = reprocessReceiptSchema.safeParse(input);

  if (!parsed.success) {
    return { error: "Validation failed", success: false as const };
  }

  const { models, receiptId } = parsed.data;

  const receipt = await db.query.receipts.findFirst({
    where: { id: receiptId, userId: session.user.id },
  });

  if (!receipt) {
    return { error: "Receipt not found", success: false as const };
  }

  if (receipt.status !== "done" && receipt.status !== "error") {
    return {
      error: "Receipt is not ready to re-process",
      success: false as const,
    };
  }

  if (!receipt.objectKey) {
    return {
      error: "Receipt has no image to re-process",
      success: false as const,
    };
  }

  // Checked against what the provider actually has loaded rather than trusted
  // from the picker: a run cannot get anywhere without LM Studio, so asking now
  // turns an opaque provider error into a message naming the real problem. An
  // empty list means the question could not be asked at all, which is a
  // different fault from the model not being loaded and must not read as one.
  const reported = await listAvailableModels();

  if (reported.length === 0) {
    return {
      error: "The model server is not reachable",
      success: false as const,
    };
  }

  const available = new Set(reported);

  if (!available.has(models.ocr) || !available.has(models.parse)) {
    return { error: "That model is not available", success: false as const };
  }

  const claimed = await db
    .update(receipts)
    .set({ status: "processing" })
    .where(
      and(
        eq(receipts.id, receiptId),
        inArray(receipts.status, ["done", "error"])
      )
    )
    .returning({ id: receipts.id });

  if (claimed.length === 0) {
    return {
      error: "Receipt is already being processed",
      success: false as const,
    };
  }

  try {
    await inngest.send([
      receiptReprocessEvent.create(
        {
          models,
          // Restored by the function's failure handler, so a re-process that
          // fails leaves the receipt as findable as it was before.
          previousStatus: receipt.status,
          receiptId,
          userId: session.user.id,
        },
        { id: crypto.randomUUID() }
      ),
    ]);
  } catch {
    // Guarded on the claim this request made, so a rollback can never undo a
    // status something else moved the receipt to in the meantime.
    await db
      .update(receipts)
      .set({ status: receipt.status })
      .where(
        and(eq(receipts.id, receiptId), eq(receipts.status, "processing"))
      );

    return { error: "Failed to start re-processing", success: false as const };
  }

  revalidatePath("/receipts");

  return { success: true as const };
};
