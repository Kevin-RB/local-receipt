import { z } from "zod";

/** An inclusive calendar date in the receipt timezone, as `YYYY-MM-DD`. */
export const isoDate = z.iso.date().describe("An inclusive date (YYYY-MM-DD).");

export const isoDateRange = {
  from: isoDate.optional(),
  to: isoDate.optional(),
};
