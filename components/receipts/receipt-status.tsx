"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { useReceiptRealtime } from "@/hooks/use-receipt-realtime";
import type { ReceiptState } from "@/hooks/use-receipt-realtime";

import type { ReceiptTable } from "./columns";

type BadgeVariant = "default" | "destructive" | "outline" | "secondary";

export interface StatusBadge {
  label: string;
  variant: BadgeVariant;
}

const statusBadgeVariant: Record<ReceiptTable["status"], BadgeVariant> = {
  done: "default",
  error: "destructive",
  pending: "secondary",
  processing: "secondary",
  uploading: "secondary",
};

/**
 * What a run in flight shows in place of the stored status.
 *
 * `failed` is labelled `error` so the badge reads the same before and after the
 * refresh that follows a terminal state: the refresh re-reads the stored status,
 * which says `error`, and wording the live state `failed` would make the badge
 * rename itself for the same outcome.
 */
const liveBadge: Record<NonNullable<ReceiptState>, StatusBadge> = {
  done: { label: "done", variant: "default" },
  extracting: { label: "extracting", variant: "secondary" },
  failed: { label: "error", variant: "destructive" },
  parsing: { label: "parsing", variant: "secondary" },
  storing: { label: "storing", variant: "secondary" },
};

/** The badge for a receipt: its run's stage while one reports, else its status. */
export const statusBadge = (
  status: ReceiptTable["status"],
  state: ReceiptState
): StatusBadge =>
  state
    ? liveBadge[state]
    : { label: status, variant: statusBadgeVariant[status] };

/**
 * A receipt's processing status, following a run that is in flight.
 *
 * The stored status only moves at the two ends of a run — claimed before it
 * starts, set when it stores — so without this a re-processed receipt sits on
 * `processing` until the page is reloaded, which on a local model can be most
 * of a minute. Subscribing only while a run is coming or going keeps the table
 * to one connection per in-flight receipt rather than one per receipt on the
 * page. A `pending` receipt subscribes as well as a `processing` one, so the
 * first message of a first extraction is not missed while the table catches up.
 *
 * A stage published before this cell's socket opened is not seen: the realtime
 * client keeps no server-side replay to offer, and `historyLimit` only caps
 * what it retains locally. The terminal message that matters therefore depends
 * on the subscription catching it, which is the one thing here that cannot be
 * guaranteed — a run that finishes entirely inside a dropped connection leaves
 * the row on `processing` until the page is reloaded.
 *
 * Reaching a terminal state refreshes once per message, which is what pulls the
 * new extraction into the row.
 */
export const ReceiptStatus = ({
  id,
  status,
}: {
  id: string;
  status: ReceiptTable["status"];
}) => {
  const router = useRouter();
  const inFlight = status === "processing" || status === "pending";
  const realtime = useReceiptRealtime({ receiptId: inFlight ? id : null });
  const message = realtime.messages.byTopic.state;
  const state = message?.data.state;
  const refreshedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!message || message.kind !== "data") {
      return;
    }

    if (state !== "done" && state !== "failed") {
      return;
    }

    // Once per terminal *message*, not once per cell. This cell stays mounted
    // across runs, so a latch that only ever latches swallows every re-process
    // after the first — and the hook does not clear its messages when it is
    // disabled, so the previous run's `done` is still there when the next run
    // starts. The message's own arrival time identifies the run, which is what
    // makes that stale terminal state a no-op.
    const arrived = message.createdAt.getTime();

    if (refreshedAt.current === arrived) {
      return;
    }

    refreshedAt.current = arrived;
    router.refresh();
  }, [message, router, state]);

  const badge = statusBadge(status, state ?? null);

  return <Badge variant={badge.variant}>{badge.label}</Badge>;
};
