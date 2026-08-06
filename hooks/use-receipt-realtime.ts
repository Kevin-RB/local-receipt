"use client";

import { useRealtime } from "inngest/react";

import { fetchReceiptSubscriptionToken } from "@/lib/inngest/actions";
import { receiptChannel } from "@/lib/inngest/channels";

export type ReceiptState =
  | "extracting"
  | "parsing"
  | "storing"
  | "done"
  | "failed"
  | null;

export const useReceiptRealtime = ({
  receiptId,
}: {
  receiptId: string | null;
}) =>
  useRealtime({
    autoCloseOnTerminal: true,
    channel: receiptChannel(receiptId ?? ""),
    enabled: !!receiptId,
    pauseOnHidden: true,
    reconnect: true,
    token: () => {
      if (!receiptId) {
        throw new Error("Cannot fetch token without receiptId");
      }
      return fetchReceiptSubscriptionToken(receiptId);
    },
    topics: ["state"] as const,
  });
