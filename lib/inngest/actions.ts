"use server";

import { getClientSubscriptionToken } from "inngest/react";

import { receiptChannel } from "@/lib/inngest/channels";
import { inngest } from "@/lib/inngest/client";

// oxlint-disable-next-line require-await
export const fetchReceiptSubscriptionToken = async (receiptId: string) =>
  getClientSubscriptionToken(inngest, {
    channel: receiptChannel(receiptId),
    topics: ["state"],
  });
