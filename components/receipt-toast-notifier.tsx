"use client";

import { useEffect, useRef } from "react";

import { toast } from "@/components/ui/toast";
import { useReceiptRealtime } from "@/hooks/use-receipt-realtime";

export const ReceiptToastNotifier = ({ receiptId }: { receiptId: string }) => {
  const toastIdRef = useRef<string | null>(null);
  const prevStateRef = useRef<string | null>(null);

  const { connectionStatus, error, failureReason, receipt, state } =
    useReceiptRealtime({
      enabled: true,
      receiptId,
    });

  useEffect(() => {
    toastIdRef.current = toast.add({
      description: "Connecting...",
      timeout: 0,
      title: "Upload complete",
      type: "loading",
    });

    return () => {
      if (toastIdRef.current) {
        toast.close(toastIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!toastIdRef.current) {
      return;
    }

    if (state === prevStateRef.current && connectionStatus !== "disconnected") {
      return;
    }
    prevStateRef.current = state;

    if (state === "extracting") {
      toast.update(toastIdRef.current, {
        description: "Reading text from your receipt image",
        title: "Extracting text...",
        type: "loading",
      });
    } else if (state === "parsing") {
      toast.update(toastIdRef.current, {
        description: "Identifying items, totals, and merchant info",
        title: "Parsing receipt...",
        type: "loading",
      });
    } else if (state === "complete") {
      toast.update(toastIdRef.current, {
        description: receipt
          ? `${receipt.merchant.name} — ${receipt.totals.total}`
          : "Receipt data is now available",
        timeout: 10_000,
        title: "Receipt processed!",
        type: "success",
      });
    } else if (state === "failed") {
      toast.update(toastIdRef.current, {
        description: failureReason ?? "An unknown error occurred",
        timeout: 0,
        title: "Processing failed",
        type: "error",
      });
    } else if (connectionStatus === "disconnected" && !state) {
      toast.update(toastIdRef.current, {
        description: "Waiting for server...",
        title: "Upload complete",
        type: "loading",
      });
    }
  }, [connectionStatus, failureReason, receipt, state]);

  useEffect(() => {
    if (error && toastIdRef.current) {
      toast.update(toastIdRef.current, {
        description: error.message,
        timeout: 0,
        title: "Connection error",
        type: "error",
      });
    }
  }, [error]);

  return null;
};
