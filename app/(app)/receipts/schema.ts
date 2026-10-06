import { z } from "zod";

import { extractionModelsSchema } from "@/lib/ai/models";

export const reprocessReceiptSchema = z.object({
  models: extractionModelsSchema,
  receiptId: z.uuid({ message: "Invalid receipt ID" }),
});

export type ReprocessReceiptInput = z.infer<typeof reprocessReceiptSchema>;
