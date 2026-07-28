import { realtime } from "inngest";
import { z } from "zod/v4";

const ReceiptItemShape = z.object({
  line_total: z.number(),
  name: z.string(),
  quantity: z.number().optional(),
  unit_price: z.number().optional(),
});

const ReceiptPayload = z.object({
  hasIntegrityWarning: z.boolean(),
  items: z.array(ReceiptItemShape),
  merchant: z.object({
    abn: z.string().optional(),
    address: z.string().optional(),
    name: z.string(),
    store_id: z.string().optional(),
  }),
  payment: z.object({ method: z.string().optional() }),
  receiptNumber: z.string().optional(),
  totals: z.object({
    gst: z.number().optional(),
    subtotal: z.number().optional(),
    total: z.number(),
  }),
  transactionDateTime: z.string().optional(),
});

export const receiptChannel = realtime.channel({
  name: ({ receiptId }: { receiptId: string }) => `receipt:${receiptId}`,
  topics: {
    state: {
      schema: z.object({
        error: z.string().optional(),
        receipt: ReceiptPayload.optional(),
        state: z.enum(["extracting", "parsing", "complete", "failed"]),
        ts: z.number(),
      }),
    },
  },
});

export type ReceiptPayload = z.infer<typeof ReceiptPayload>;
