"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db, receiptItems, receipts } from "@/lib/db";
import { receiptToFlat } from "@/lib/db/receipt-mapping";
import { computeIntegrityWarning } from "@/lib/receipt/integrity";

import { updateReceiptSchema } from "./schema";
import type { UpdateReceiptInput } from "./schema";

export const updateReceipt = async (input: UpdateReceiptInput) => {
  const parsed = updateReceiptSchema.safeParse(input);

  if (!parsed.success) {
    return { error: "Validation failed", success: false as const };
  }

  const { items, merchant, payment, receiptId, totals, transaction } =
    parsed.data;

  const existing = await db.query.receipts.findFirst({
    where: { id: receiptId },
  });

  if (!existing || existing.status !== "done") {
    return { error: "Receipt is not editable", success: false as const };
  }

  const hasIntegrityWarning = computeIntegrityWarning(items, totals);

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(receipts)
        .set({
          ...receiptToFlat({ merchant, payment, totals, transaction }),
          hasIntegrityWarning,
        })
        .where(eq(receipts.id, receiptId));

      await tx
        .delete(receiptItems)
        .where(eq(receiptItems.receiptId, receiptId));

      if (items.length > 0) {
        await tx.insert(receiptItems).values(
          items.map((item) => ({
            ...item,
            receiptId,
          }))
        );
      }
    });
  } catch {
    return { error: "Failed to save receipt", success: false as const };
  }

  revalidatePath(`/receipts/${receiptId}`);

  return { success: true as const };
};
