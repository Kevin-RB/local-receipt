"use client";

import { useRealtime } from "inngest/react";

import { fetchReceiptSubscriptionToken } from "@/lib/inngest/actions";
import { receiptChannel } from "@/lib/inngest/channels";
import type { ReceiptPayload } from "@/lib/inngest/channels";

export interface ReceiptRealtimeState {
  connectionStatus: string;
  error: Error | null;
  receipt: ReceiptPayload | null;
  result: unknown;
  state: "extracting" | "parsing" | "complete" | "failed" | null;
  failureReason: string | null;
}

export const useReceiptRealtime = ({
  enabled,
  receiptId,
}: {
  enabled: boolean;
  receiptId: string | null;
}): ReceiptRealtimeState => {
  const { connectionStatus, error, messages, result } = useRealtime({
    channel: receiptChannel({ receiptId: receiptId ?? "" }),
    enabled: enabled && receiptId !== null,
    token: () => {
      if (!receiptId) {
        throw new Error("Cannot fetch token without receiptId");
      }
      return fetchReceiptSubscriptionToken(receiptId);
    },
    topics: ["state"] as const,
  });

  const lastState = messages.byTopic.state?.data;

  return {
    connectionStatus,
    error,
    failureReason: lastState?.error ?? null,
    receipt: lastState?.receipt ?? null,
    result,
    state: lastState?.state ?? null,
  };
};
