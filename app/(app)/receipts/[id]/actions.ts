"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { db, listCategoryOptions, receiptItems, receipts } from "@/lib/db";
import { receiptToFlat } from "@/lib/db/receipt-mapping";
import { reconcile } from "@/lib/receipt/integrity";
import { planLineItemChanges } from "@/lib/receipt/line-items";

import { updateReceiptSchema } from "./schema";
import type { UpdateReceiptInput } from "./schema";

export const updateReceipt = async (input: UpdateReceiptInput) => {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return { error: "Receipt is not editable", success: false as const };
  }

  const parsed = updateReceiptSchema.safeParse(input);

  if (!parsed.success) {
    return { error: "Validation failed", success: false as const };
  }

  const { items, merchant, payment, receiptId, totals, transaction } =
    parsed.data;

  const existing = await db.query.receipts.findFirst({
    where: { id: receiptId, userId: session.user.id },
    with: { receiptItems: true },
  });

  if (!existing || existing.status !== "done") {
    return { error: "Receipt is not editable", success: false as const };
  }

  // Categories are bounded by the taxonomy: a submitted id that is not a leaf
  // category is rejected rather than stored, so a manual edit cannot introduce
  // a classification the rest of the app would not recognise.
  const categoryIds = items.flatMap((item) =>
    item.categoryId ? [item.categoryId] : []
  );
  if (categoryIds.length > 0) {
    const options = await listCategoryOptions();
    const leafIds = new Set(options.map((option) => option.id));
    if (categoryIds.some((categoryId) => !leafIds.has(categoryId))) {
      return { error: "Validation failed", success: false as const };
    }
  }

  const plan = planLineItemChanges(
    existing.receiptItems.map((item) => ({
      categoryId: item.categoryId,
      categorySource: item.categorySource,
      id: item.id,
    })),
    items
  );

  const hasIntegrityWarning = !reconcile(items, totals).matches;

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(receipts)
        .set({
          ...receiptToFlat({ merchant, payment, totals, transaction }),
          hasIntegrityWarning,
        })
        .where(eq(receipts.id, receiptId));

      await Promise.all(
        plan.updates.map((change) =>
          tx
            .update(receiptItems)
            .set(change.values)
            .where(eq(receiptItems.id, change.id))
        )
      );

      if (plan.inserts.length > 0) {
        await tx
          .insert(receiptItems)
          .values(plan.inserts.map((values) => ({ ...values, receiptId })));
      }

      if (plan.removals.length > 0) {
        await tx
          .delete(receiptItems)
          .where(inArray(receiptItems.id, plan.removals));
      }
    });
  } catch {
    return { error: "Failed to save receipt", success: false as const };
  }

  revalidatePath(`/receipts/${receiptId}`);

  return { success: true as const };
};
