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

const DEV_INNGEST_PORT = 8288;

// In local development the subscription token carries the server's
// `INNGEST_BASE_URL` (`http://localhost:8288`), which a phone loading the app
// from `http://kevin:3000` cannot reach. Point the browser at the Inngest dev
// server on whatever host the app itself was loaded from. Every other
// environment — staging and production — falls back to the token's own
// (cloud) base URL.
const resolveDevInngestApiBaseUrl = () => {
  if (typeof window === "undefined" || process.env.NODE_ENV !== "development") {
    return;
  }
  return `${window.location.protocol}//${window.location.hostname}:${DEV_INNGEST_PORT}`;
};

export const useReceiptRealtime = ({
  receiptId,
}: {
  receiptId: string | null;
}) =>
  useRealtime({
    apiBaseUrl: resolveDevInngestApiBaseUrl(),
    autoCloseOnTerminal: false,
    channel: receiptChannel(receiptId ?? ""),
    enabled: !!receiptId,
    // A subscription is not open the instant a run starts — the receipts table
    // only subscribes once it has re-rendered with the receipt claimed — so
    // without replaying recent messages a fast run could finish before the
    // subscriber existed and the terminal state, the one that matters, would
    // never arrive.
    historyLimit: 20,
    pauseOnHidden: false,
    reconnect: true,
    token: () => {
      if (!receiptId) {
        throw new Error("Cannot fetch token without receiptId");
      }
      return fetchReceiptSubscriptionToken(receiptId);
    },
    topics: ["state"] as const,
  });

export type ReceiptRealtime = ReturnType<typeof useReceiptRealtime>;
