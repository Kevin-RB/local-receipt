import { tool } from "ai";
import { z } from "zod";

import { categoryTotalsSchema } from "../output-schemas";
import { spendByCategory } from "../queries";
import { isoDate } from "./date-range";

export const spend_by_category = (ownerId: string) =>
  tool({
    description:
      "Total spend per category between two inclusive dates, counting products only.",
    execute: ({ from, to }) => spendByCategory(ownerId, from, to),
    inputSchema: z.object({ from: isoDate, to: isoDate }),
    outputSchema: categoryTotalsSchema,
  });
