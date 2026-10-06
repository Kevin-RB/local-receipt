import type { CategoryOption } from "@/lib/db";

/**
 * A leaf category paired with the top-level category it sits under, ready for
 * rendering as a grouped select. Leaf categories with no parent (e.g. "Other")
 * form a group of their own so the list is never a flat wall of entries.
 *
 * @see UNGROUPED_LABEL for why that group is not called "Uncategorised".
 */
export interface CategoryOptionGroup {
  label: string;
  options: { label: string; value: string }[];
}

/** The label for the option meaning "this item has no category". */
export const UNCATEGORISED_LABEL = "Uncategorised";

/**
 * The group label for leaf categories that sit directly under no top-level
 * category (e.g. "Other"). Deliberately not `UNCATEGORISED_LABEL`: in one popup
 * that word would mean both "no category" and "real leaves", which are opposite
 * things to choose.
 */
export const UNGROUPED_LABEL = "Top-level categories";

/** A select value no category id can collide with, standing for "no category". */
export const UNCATEGORISED_CATEGORY = "uncategorised";

export const groupCategoryOptions = (
  options: CategoryOption[]
): CategoryOptionGroup[] => {
  const groups = new Map<string, CategoryOptionGroup>();

  for (const option of options) {
    const label = option.parentName ?? UNGROUPED_LABEL;
    const group = groups.get(label) ?? { label, options: [] };
    group.options.push({ label: option.name, value: option.id });
    groups.set(label, group);
  }

  return [...groups.values()].toSorted((a, b) =>
    a.label.localeCompare(b.label)
  );
};

/**
 * Flattens the groups into the label-per-value list the select needs to
 * render the current value's name in its trigger — the popup is grouped for
 * scanning, but the trigger shows a bare label.
 */
export const flattenCategoryOptions = (
  groups: CategoryOptionGroup[]
): { label: string; value: string }[] =>
  groups.flatMap((group) => group.options);
