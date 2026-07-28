"use server";

import { getClientSubscriptionToken } from "inngest/react";

import { receiptChannel } from "@/lib/inngest/channels";
import { inngest } from "@/lib/inngest/client";

export const fetchReceiptSubscriptionToken = (receiptId: string) =>
  getClientSubscriptionToken(inngest, {
    channel: receiptChannel({ receiptId }),
    topics: ["state"],
  });
