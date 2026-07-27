import { channel } from "inngest/realtime";
import { z } from "zod/v4";

export const receiptChannel = channel({
  name: (receiptId: string) => `receipt:${receiptId}`,
  topics: {
    state: {
      schema: z.object({
        error: z.string().optional(),
        state: z.enum(["extracting", "parsing", "complete", "failed"]),
        ts: z.number(),
      }),
    },
  },
});
