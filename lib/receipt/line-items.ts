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
  categoryId: string | null;
  categorySource: CategorySource;
  kind: LineItemKind;
  lineTotal: number;
  name: string;
  quantity?: number | null;
  unitPrice?: number | null;
}

export interface LineItemChangePlan {
  inserts: LineItemValues[];
  removals: string[];
  updates: { id: string; values: LineItemValues }[];
}

/**
 * Reconciles the line items a user submitted against the ones the receipt
 * stores, so that a manual edit updates rows in place rather than replacing
 * them. Matching by id is what lets a category survive an edit: the
 * `category_source` marker on the stored row decides whether the submitted
 * category is a new user decision or the same category the AI already chose.
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
    const categoryId = item.categoryId ?? null;
    // The stored category is the baseline: a submitted category that differs
    // from it is a user decision, and one that matches it leaves the existing
    // marker alone. Clearing a category counts as a decision too — it is how a
    // user says "this item belongs to no category", and a re-run must respect
    // that. A brand-new item with no category is different: nobody has decided
    // anything about it, so `ai` leaves it eligible for categorization.
    const categorySource =
      existing && existing.categoryId !== categoryId
        ? "user"
        : (existing?.categorySource ?? (categoryId === null ? "ai" : "user"));
    const values: LineItemValues = {
      categoryId,
      categorySource,
      kind: item.kind,
      lineTotal: item.lineTotal,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    };

    if (existing) {
      keptIds.add(existing.id);
      plan.updates.push({ id: existing.id, values });
    } else {
      plan.inserts.push(values);
    }
  }

  for (const item of stored) {
    if (!keptIds.has(item.id)) {
      plan.removals.push(item.id);
    }
  }

  return plan;
};
