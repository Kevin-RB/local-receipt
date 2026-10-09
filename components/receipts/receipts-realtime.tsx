"use client";

import { useRealtime } from "inngest/react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";

import { fetchReceiptsSubscriptionToken } from "@/lib/inngest/actions";
import { receiptStateSchema, receiptsChannel } from "@/lib/inngest/channels";
import type { ReceiptStateData } from "@/lib/inngest/channels";

import { ReceiptsRealtimeContext } from "./receipts-realtime-context";
import type { ReceiptsRealtimeValue } from "./receipts-realtime-context";
import { refreshForTransition, stateTier } from "./refresh-policy";
import type { StateTier } from "./refresh-policy";

/**
 * Long enough to fold a burst of completions into one refetch, short enough to
 * still read as live. The route it refreshes re-reads every receipt, so the
 * difference between one refetch and N in a burst is the whole point.
 */
const REFRESH_DEBOUNCE_MS = 400;

/**
 * The page's one subscription to the owner's channel.
 *
 * Every receipt the owner can see reports on `receiptsChannel(userId)`, so the
 * provider subscribes once and fans messages out by `receiptId` instead of each
 * row and the upload toast opening their own stream (and minting their own
 * token, and retrying their own failed mint forever). It also owns the refresh
 * policy: a receipt that appears for the first time, or reaches a terminal
 * state, schedules exactly one `router.refresh()`, debounced across all rows.
 */
export const ReceiptsRealtimeProvider = ({
  children,
  initialReceiptIds,
  userId,
}: {
  children: ReactNode;
  initialReceiptIds: string[];
  userId: string;
}) => {
  const router = useRouter();
  const realtime = useRealtime({
    // A user channel carries many runs and never reaches one terminal status,
    // so the socket stays open for the life of the page.
    autoCloseOnTerminal: false,
    channel: receiptsChannel(userId),
    // Keep watching while the tab is backgrounded: the run can finish while the
    // page is hidden, and there is no replay to catch up on later.
    pauseOnHidden: false,
    // A dropped stream should heal itself. The storm this replaced came from a
    // per-receipt channel retrying per row; one channel caps any failure at one
    // loop for the page, so the value of reconnecting outweighs the risk.
    reconnect: true,
    token: fetchReceiptsSubscriptionToken,
    topics: ["state"] as const,
  });

  const byReceipt = useMemo(() => {
    const states = new Map<string, ReceiptStateData>();

    for (const message of realtime.messages.all) {
      // `messages.all[].data` is `unknown` in the SDK's types even though the
      // topic schema is attached; parse rather than cast, so the map is typed
      // from the same schema the publisher validates against.
      const parsed = receiptStateSchema.safeParse(message.data);
      if (parsed.success) {
        states.set(parsed.data.receiptId, parsed.data);
      }
    }

    return states;
  }, [realtime.messages.all]);

  const onPage = useMemo(() => new Set(initialReceiptIds), [initialReceiptIds]);
  const seen = useRef(new Map<string, StateTier>());
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefresh = useCallback(() => {
    if (pending.current) {
      clearTimeout(pending.current);
    }

    pending.current = setTimeout(() => {
      pending.current = null;
      startTransition(() => router.refresh());
    }, REFRESH_DEBOUNCE_MS);
  }, [router]);

  useEffect(() => {
    let owed = false;

    for (const [id, { state }] of byReceipt) {
      const previous = seen.current.get(id);

      if (
        refreshForTransition(previous, state, onPage.has(id)) === "schedule"
      ) {
        owed = true;
      }

      seen.current.set(id, stateTier(state));
    }

    if (owed) {
      scheduleRefresh();
    }
  }, [byReceipt, onPage, scheduleRefresh]);

  useEffect(
    () => () => {
      if (pending.current) {
        clearTimeout(pending.current);
      }
    },
    []
  );

  const value = useMemo<ReceiptsRealtimeValue>(
    () => ({
      byReceipt,
      connectionStatus: realtime.connectionStatus,
      error: realtime.error,
    }),
    [byReceipt, realtime.connectionStatus, realtime.error]
  );

  return (
    <ReceiptsRealtimeContext.Provider value={value}>
      {children}
    </ReceiptsRealtimeContext.Provider>
  );
};
