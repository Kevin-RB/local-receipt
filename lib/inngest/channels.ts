import { channel } from "inngest/realtime";
import { z } from "zod";

export const receiptStateSchema = z.object({
  state: z.enum(["extracting", "parsing", "storing", "done", "failed"]),
});

export type ReceiptStateData = z.infer<typeof receiptStateSchema>;

export const receiptChannel = channel({
  name: (receiptId: string) => `receipt:${receiptId}`,
  topics: {
    state: {
      schema: receiptStateSchema,
    },
  },
});
