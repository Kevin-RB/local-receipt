import { tool } from "ai";
import { z } from "zod";

import { merchantTotalsSchema } from "../output-schemas";
import { spendByMerchant } from "../queries";
import { isoDate } from "./date-range";

export const spend_by_merchant = (ownerId: string) =>
  tool({
    description: "Total spend per merchant between two inclusive dates.",
    execute: ({ from, to }) => spendByMerchant(ownerId, from, to),
    inputSchema: z.object({ from: isoDate, to: isoDate }),
    outputSchema: merchantTotalsSchema,
  });
