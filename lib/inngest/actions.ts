"use server";

import { getClientSubscriptionToken } from "inngest/react";

import { receiptChannel } from "@/lib/inngest/channels";
import { inngest } from "@/lib/inngest/client";

export const fetchReceiptSubscriptionToken = async (receiptId: string) => {
  const token = await getClientSubscriptionToken(inngest, {
    channel: receiptChannel({ receiptId }),
    topics: ["state"],
  });
  return token;
};
