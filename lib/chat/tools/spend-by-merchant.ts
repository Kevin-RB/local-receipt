import { tool } from "ai";
import { z } from "zod";

import { merchantSpendSchema } from "../output-schemas";
import { spendByMerchant } from "../queries";
import { isoDate } from "./date-range";

export const spend_by_merchant = (ownerId: string) =>
  tool({
    description:
      "Total spend per merchant between two inclusive dates, with the overall total. Use for 'how much did I spend at <merchant>?' questions. It takes dates only and does not filter by product or category — use search_line_items for a product and spend_by_category for a category.",
    execute: ({ from, to }) => spendByMerchant(ownerId, from, to),
    inputSchema: z.object({ from: isoDate, to: isoDate }),
    outputSchema: merchantSpendSchema,
  });
