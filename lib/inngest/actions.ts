"use server";

import { getClientSubscriptionToken } from "inngest/react";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { receiptsChannel } from "@/lib/inngest/channels";
import { inngest } from "@/lib/inngest/client";

/**
 * Mints the token for the signed-in owner's own channel.
 *
 * The channel name comes from the session, never from the caller, so there is
 * no id to forge and no per-receipt ownership check to make: a caller can only
 * ever subscribe to the channel their own session names. The receipts page
 * subscribes once; every receipt the owner can see is a message on it.
 */
export const fetchReceiptsSubscriptionToken = async () => {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    throw new Error("Unauthorized");
  }

  return getClientSubscriptionToken(inngest, {
    channel: receiptsChannel(session.user.id),
    topics: ["state"],
  });
};
