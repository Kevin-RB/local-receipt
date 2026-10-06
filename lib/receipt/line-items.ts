import type {
  CategorySource,
  LineItemKind,
} from "@/lib/db/schema/receipt-item";

/** The stored category state of a line item, as the edit form sees it. */
export interface StoredLineItem {
  categoryId: string | null;
  categorySource: CategorySource;
  id: string;
}

/** A line item as submitted by the receipt edit form. */
export interface SubmittedLineItem {
  categoryId?: string | null;
  /**
   * Whether the user actually changed this item's category in the form.
   *
   * The submitted `categoryId` is a snapshot taken when the page loaded, so it
   * cannot by itself say what the user meant: categorization may fill an item
   * in between, and an untouched field must not overwrite that. Without this
   * signal a stale `null` would be recorded as a user clear and the item would
   * be skipped by every future categorization run.
   */
  categoryTouched?: boolean;
  /**
   * The id of the stored line item this submission edits, or absent for a line
   * the user added. Not named `id` because the edit form's field array
   * generates an `id` of its own for every row it renders.
   */
  itemId?: string | undefined;
  kind: LineItemKind;
  lineTotal: number;
  name: string;
  quantity?: number | null;
  unitPrice?: number | null;
}

interface LineItemValues {
  kind: LineItemKind;
  lineTotal: number;
  name: string;
  quantity?: number | null;
  unitPrice?: number | null;
}

/** The category columns an update writes; absent when the user left them be. */
interface CategoryValues {
  categoryId: string | null;
  categorySource: CategorySource;
}

type LineItemWrite = LineItemValues & Partial<CategoryValues>;

export interface LineItemChangePlan {
  inserts: LineItemWrite[];
  removals: string[];
  updates: { id: string; values: LineItemWrite }[];
}

/**
 * Reconciles the line items a user submitted against the ones the receipt
 * stores, so that a manual edit updates rows in place rather than replacing
 * them. Matching by id is what lets a category survive an edit.
 *
 * A category is written only when `categoryTouched` says the user changed it.
 * That is what separates "the user chose this" from "the form still held what
 * was stored when it loaded": categorization can land in between, and a stale
 * value must not be recorded as a human decision. An untouched update carries
 * no category columns at all, so the stored ones are left alone and stay
 * re-runnable.
 *
 * Ids are matched only against `stored`, which the caller has already scoped to
 * the owner, so a submitted id belonging to another receipt is an insert rather
 * than an update against someone else's row.
 */
export const planLineItemChanges = (
  stored: StoredLineItem[],
  submitted: SubmittedLineItem[]
): LineItemChangePlan => {
  const storedById = new Map(stored.map((item) => [item.id, item]));
  const plan: LineItemChangePlan = { inserts: [], removals: [], updates: [] };
  const keptIds = new Set<string>();

  for (const item of submitted) {
    const existing = item.itemId ? storedById.get(item.itemId) : undefined;
    const values: LineItemWrite = {
      kind: item.kind,
      lineTotal: item.lineTotal,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    };

    if (!existing) {
      // A line the user added: whatever category they gave it is their
      // decision, and no category at all leaves it eligible for
      // categorization.
      plan.inserts.push({
        ...values,
        categoryId: item.categoryId ?? null,
        categorySource: item.categoryId ? "user" : "ai",
      });
      continue;
    }

    keptIds.add(existing.id);

    // Only a category the user actually touched is written. Leaving the columns
    // off the update keeps whatever is stored, including a category written
    // after this form loaded.
    if (item.categoryTouched) {
      const categoryId = item.categoryId ?? null;
      plan.updates.push({
        id: existing.id,
        values: {
          ...values,
          categoryId,
          categorySource:
            existing.categoryId === categoryId
              ? existing.categorySource
              : "user",
        },
      });
    } else {
      plan.updates.push({ id: existing.id, values });
    }
  }

  for (const item of stored) {
    if (!keptIds.has(item.id)) {
      plan.removals.push(item.id);
    }
  }

  return plan;
};
