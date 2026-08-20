"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db, receipts } from "@/lib/db";
import { BUCKET, deleteObject } from "@/lib/minio/client";

export const deleteReceipt = async (receiptId: string) => {
  const existing = await db.query.receipts.findFirst({
    where: { id: receiptId },
  });

  if (!existing) {
    return { error: "Receipt not found", success: false as const };
  }

  if (existing.minioObjectKey) {
    await deleteObject({ bucket: BUCKET, key: existing.minioObjectKey });
  }

  await db.delete(receipts).where(eq(receipts.id, receiptId));

  revalidatePath("/");

  return { success: true as const };
};
