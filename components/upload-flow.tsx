"use client";

import { useState } from "react";

import { ReceiptToastNotifier } from "@/components/receipt-toast-notifier";
import {
  useReceiptState,
  useReceiptsRealtime,
} from "@/components/receipts/receipts-realtime-context";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

import { ImageUploadCard } from "./image-upload-card";

type UploadMachine =
  | { status: "done"; receiptId: string }
  | { status: "idle" }
  | { status: "requesting-url" }
  | { status: "uploading-to-storage" };

export const UploadFlow = () => {
  const [upload, setUpload] = useState<UploadMachine>({ status: "idle" });
  const [completedReceiptId, setCompletedReceiptId] = useState<string | null>(
    null
  );
  const { connectionStatus, error } = useReceiptsRealtime();
  const receiptId = upload.status === "done" ? upload.receiptId : null;
  const liveState = useReceiptState(receiptId ?? "");
  const state = liveState?.state;
  const isTerminalState = state === "done" || state === "failed";
  const isProcessing = upload.status === "done" && !isTerminalState;

  // Remount the upload card once a completed upload reaches a terminal state so
  // its preview and file selection are cleared for the next receipt. State is
  // adjusted during render (guarded against a loop), the documented pattern for
  // deriving state from changing inputs; an effect is not used because
  // react-compiler's EffectSetState rule rejects setState in effect bodies.
  if (isTerminalState && receiptId && completedReceiptId !== receiptId) {
    setCompletedReceiptId(receiptId);
  }
  const uploadCardKey = completedReceiptId ?? "active";

  return (
    <>
      <Card className="w-full max-w-md">
        <CardContent>
          <ImageUploadCard
            key={uploadCardKey}
            isProcessing={isProcessing}
            onUploadComplete={(id) =>
              setUpload({ receiptId: id, status: "done" })
            }
            onUploadError={() => setUpload({ status: "idle" })}
            onUploadStateChange={(stage) => setUpload({ status: stage })}
          />
        </CardContent>
        <CardFooter className="justify-center">
          Upload a receipt image to get AI-powered insights.
        </CardFooter>
      </Card>
      {upload.status === "done" && (
        <ReceiptToastNotifier
          connectionStatus={connectionStatus}
          error={error}
          state={state}
          stateError={liveState?.error}
        />
      )}
    </>
  );
};
