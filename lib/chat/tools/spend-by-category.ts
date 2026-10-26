import { tool } from "ai";
import { z } from "zod";

import { categorySpendSchema } from "../output-schemas";
import { spendByCategory } from "../queries";
import { isoDate } from "./date-range";

/** Exported so its grouping contract can be asserted directly. */
export const spendByCategoryInput = z.object({
  category: z
    .string()
    .optional()
    .describe(
      'Narrow to one category by name: a top-level category such as "Health", which returns its subcategories, or a single subcategory such as "Pharmacy".'
    ),
  from: isoDate,
  groupBy: z
    .enum(["subcategory", "category"])
    .optional()
    .describe(
      'Use "category" for a question about a whole top-level category, such as Groceries; omit it for the subcategory breakdown.'
    ),
  to: isoDate,
});

export const spend_by_category = (ownerId: string) =>
  tool({
    description:
      "Total spend between two inclusive dates, counting products only, broken down by subcategory (the leaf categories, the default) or by top-level category, and optionally narrowed to one category. Use for category questions such as 'how much did I spend on groceries?'. The overall total is included.",
    execute: ({ category, from, groupBy, to }) =>
      spendByCategory(ownerId, from, to, { category, groupBy }),
    inputSchema: spendByCategoryInput,
    outputSchema: categorySpendSchema,
  });
