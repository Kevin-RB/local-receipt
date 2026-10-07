"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Badge } from "@/components/ui/badge";
import { useReceiptRealtime } from "@/hooks/use-receipt-realtime";
import type { ReceiptState } from "@/hooks/use-receipt-realtime";

import type { ReceiptTable } from "./columns";

type BadgeVariant = "default" | "destructive" | "secondary";

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
 * `failed` is labelled `error` so the badge does not rename itself: the
 * refresh that follows a terminal state re-reads the stored status, which says
 * `error`, and wording the live state `failed` would show two different words
 * for one outcome.
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
 * `processing` until the page is reloaded, which on a local model can be most of
 * a minute. Subscribing only while a run is claiming keeps the table to one
 * connection per in-flight receipt rather than one per receipt on the page.
 *
 * A stage published before this cell's socket opened is not seen: realtime has
 * no replay to offer, so a run that finishes inside a dropped connection leaves
 * the row showing `processing` until the page is reloaded. That holds only for a
 * run whose claim already reached this table — a receipt first rendered as
 * `pending` never opens a socket at all, so a first extraction that starts and
 * finishes without this page seeing `processing` is not followed here. Re-process
 * is, because claiming the row is what puts it into `processing` and the table
 * is re-rendered immediately afterwards.
 */
export const ReceiptStatus = ({
  id,
  status,
}: {
  id: string;
  status: ReceiptTable["status"];
}) => {
  const router = useRouter();
  const realtime = useReceiptRealtime({
    receiptId: status === "processing" ? id : null,
  });
  // Depend on the whole message rather than just its `state`, so a terminal
  // message still re-runs the effect below when the previous one carried the
  // same state. The object is replaced per message, and React skips the effect
  // when every dependency is unchanged, so one message is acted on once.
  const message = realtime.messages.byTopic.state;
  const state = message?.data.state;

  useEffect(() => {
    if (message && (state === "done" || state === "failed")) {
      router.refresh();
    }
  }, [message, router, state]);

  const badge = statusBadge(status, state ?? null);

  return <Badge variant={badge.variant}>{badge.label}</Badge>;
};
