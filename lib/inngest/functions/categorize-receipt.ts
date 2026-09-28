import { eq } from "drizzle-orm";
import { NonRetriableError, eventType } from "inngest";
import { z } from "zod/v4";

import { categorizeItems } from "@/lib/ai/categorize";
import { db, listCategoryOptions, receipts } from "@/lib/db";
import { receiptItems } from "@/lib/db/schema/receipt-item";
import { inngest } from "@/lib/inngest/client";

export const receiptExtractedEvent = eventType("receipt/extracted", {
  schema: z.object({ receiptId: z.string(), userId: z.string() }),
});

export const categorizeReceipt = inngest.createFunction(
  {
    concurrency: [
      { key: "event.data.userId", limit: 2 },
      { key: "categorize", limit: 2, scope: "account" },
    ],
    id: "categorize-receipt",
    triggers: [receiptExtractedEvent],
  },
  async ({ event, step }) => {
    const { receiptId, userId } = event.data;

    const items = await step.run("load-items", async () => {
      const found = await db.query.receipts.findFirst({
        where: { id: receiptId, userId },
        with: { receiptItems: true },
      });
      if (!found) {
        throw new NonRetriableError(`Receipt ${receiptId} not found`);
      }
      return found.receiptItems.map((item) => ({
        id: item.id,
        kind: item.kind,
        name: item.name,
      }));
    });

    const options = await step.run("load-categories", () =>
      listCategoryOptions()
    );
    if (options.length === 0) {
      throw new NonRetriableError("No leaf categories are configured");
    }

    const stampCategorized = () =>
      db
        .update(receipts)
        .set({ categorizedAt: new Date() })
        .where(eq(receipts.id, receiptId));

    if (items.length === 0) {
      await step.run("mark-categorized", stampCategorized);
      return { categorized: 0, receiptId };
    }

    const assignments = await step.run("categorize", () =>
      categorizeItems(items, options)
    );

    await step.run("store-categories", async () => {
      const categoryIdBySlug = new Map(
        options.map((option) => [option.slug, option.id])
      );

      const updates = items.flatMap((item, index) => {
        const slug = assignments[index];
        const categoryId = slug ? categoryIdBySlug.get(slug) : undefined;
        if (!categoryId) {
          return [];
        }
        return [
          db
            .update(receiptItems)
            .set({ categoryId })
            .where(eq(receiptItems.id, item.id)),
        ];
      });

      await Promise.all(updates);

      await db
        .update(receipts)
        .set({ categorizedAt: new Date() })
        .where(eq(receipts.id, receiptId));
    });

    return {
      categorized: assignments.filter((slug) => slug !== null).length,
      receiptId,
    };
  }
);
