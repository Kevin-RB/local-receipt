"use client";

import type { UseRealtimeConnectionStatus } from "inngest/react";
import { createContext, useContext } from "react";

import type { ReceiptStateData } from "@/lib/inngest/channels";

export interface ReceiptsRealtimeValue {
  byReceipt: Map<string, ReceiptStateData>;
  connectionStatus: UseRealtimeConnectionStatus;
  error: Error | null;
}

export const ReceiptsRealtimeContext =
  createContext<ReceiptsRealtimeValue | null>(null);

export const useReceiptsRealtime = (): ReceiptsRealtimeValue => {
  const value = useContext(ReceiptsRealtimeContext);

  if (!value) {
    throw new Error(
      "useReceiptsRealtime must be used within ReceiptsRealtimeProvider"
    );
  }

  return value;
};

/** The latest run state reported for one receipt, or `undefined` if none has. */
export const useReceiptState = (
  receiptId: string
): ReceiptStateData | undefined =>
  useReceiptsRealtime().byReceipt.get(receiptId);
