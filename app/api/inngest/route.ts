import { serve } from "inngest/next";

import { inngest } from "@/lib/inngest/client";
import { categorizeReceipt } from "@/lib/inngest/functions/categorize-receipt";
import { transcribeReceipt } from "@/lib/inngest/functions/transcribe-receipt";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [transcribeReceipt, categorizeReceipt],
});
