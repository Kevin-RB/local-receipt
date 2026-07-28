"use client";

import { Loader2Icon } from "lucide-react";

import {
  ReceiptCard,
  receiptPayloadToCardItems,
} from "@/components/receipt-card";
import { useReceiptRealtime } from "@/hooks/use-receipt-realtime";

const STATE_STEPS = ["extracting", "parsing"] as const;

const statusClass = (isDone: boolean, isActive: boolean) => {
  if (isDone) {
    return "text-green-600";
  }
  if (isActive) {
    return "text-blue-600";
  }
  return "text-muted-foreground/50";
};

const ProgressIndicator = ({
  current,
  done,
}: {
  current: string | null;
  done: string[];
}) => (
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    {STATE_STEPS.map((step, i) => {
      const isDone = done.includes(step);
      const isActive = step === current;
      return (
        <span key={step} className="flex items-center gap-1">
          {i > 0 && <span className="mx-1 text-muted-foreground/40">→</span>}
          {isDone && <span className="text-green-600">✓</span>}
          {isActive && (
            <Loader2Icon className="size-3 animate-spin text-blue-600" />
          )}
          <span className={statusClass(isDone, isActive)}>{step}</span>
        </span>
      );
    })}
  </div>
);

const resolveDoneSteps = (state: string | null) => {
  if (state === "extracting") {
    return [];
  }
  if (state === "parsing") {
    return ["extracting"];
  }
  return ["extracting", "parsing"];
};

export const ReceiptLiveTracker = ({ receiptId }: { receiptId: string }) => {
  const { connectionStatus, error, failureReason, receipt, state } =
    useReceiptRealtime({
      enabled: true,
      receiptId,
    });

  const doneSteps = resolveDoneSteps(state);

  if (error) {
    return (
      <p className="text-sm text-red-600">Connection error: {error.message}</p>
    );
  }

  return (
    <div className="space-y-3">
      {!state && connectionStatus === "connecting" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-3 animate-spin" />
          Connecting...
        </div>
      )}

      {state && state !== "complete" && state !== "failed" && (
        <ProgressIndicator current={state} done={doneSteps} />
      )}

      {state === "failed" && (
        <div className="text-sm text-red-600">
          <p className="font-medium">Processing failed</p>
          {failureReason && <p className="mt-1">{failureReason}</p>}
        </div>
      )}

      {state === "complete" && receipt && (
        <div>
          <ProgressIndicator current={null} done={doneSteps} />
          <div className="mt-3">
            <ReceiptCard
              hasIntegrityWarning={receipt.hasIntegrityWarning}
              items={receiptPayloadToCardItems(receipt)}
              merchantName={receipt.merchant.name}
              paymentMethod={receipt.payment.method}
              receiptNumber={receipt.receiptNumber}
              total={receipt.totals.total}
              transactionDateTime={receipt.transactionDateTime}
            />
          </div>
        </div>
      )}
    </div>
  );
};
