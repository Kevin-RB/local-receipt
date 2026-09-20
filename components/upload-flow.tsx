"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ReceiptToastNotifier } from "@/components/receipt-toast-notifier";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useReceiptRealtime } from "@/hooks/use-receipt-realtime";

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
  const router = useRouter();
  const receiptId = upload.status === "done" ? upload.receiptId : null;
  const realtime = useReceiptRealtime({ receiptId });
  const state = realtime.messages.byTopic.state?.data.state;
  const refreshedRef = useRef({
    appeared: false,
    receiptId: null as string | null,
    terminal: false,
  });

  const isTerminalState =
    state === "done" ||
    state === "failed" ||
    realtime.runStatus === "completed" ||
    realtime.runStatus === "failed" ||
    realtime.runStatus === "cancelled";

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

  useEffect(() => {
    if (!(receiptId && state)) {
      return;
    }

    if (refreshedRef.current.receiptId !== receiptId) {
      refreshedRef.current = { appeared: false, receiptId, terminal: false };
    }

    const refreshed = refreshedRef.current;
    const isTerminal = state === "done" || state === "failed";

    if (isTerminal ? refreshed.terminal : refreshed.appeared) {
      return;
    }

    if (isTerminal) {
      refreshed.terminal = true;
    } else {
      refreshed.appeared = true;
    }

    router.refresh();
  }, [receiptId, state, router]);

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
        <CardFooter className="justify-center text-muted-foreground">
          Upload a receipt image to get AI-powered insights.
        </CardFooter>
      </Card>
      {upload.status === "done" && <ReceiptToastNotifier realtime={realtime} />}
    </>
  );
};
