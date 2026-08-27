"use server";

import { getClientSubscriptionToken } from "inngest/react";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { findReceiptByIdForOwner } from "@/lib/db";
import { receiptChannel } from "@/lib/inngest/channels";
import { inngest } from "@/lib/inngest/client";

export const fetchReceiptSubscriptionToken = async (receiptId: string) => {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const receipt = await findReceiptByIdForOwner(receiptId, session.user.id);

  if (!receipt) {
    throw new Error("Receipt not found");
  }

  return getClientSubscriptionToken(inngest, {
    channel: receiptChannel(receiptId),
    topics: ["state"],
  });
};
