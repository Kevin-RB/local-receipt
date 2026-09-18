"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ReceiptToastNotifier } from "@/components/receipt-toast-notifier";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useReceiptRealtime } from "@/hooks/use-receipt-realtime";

import { ImageUploadCard } from "./image-upload-card";

type UploadMachine =
  | { status: "done"; receiptId: string }
  | { status: "idle" }
  | { status: "requesting-url" }
  | { status: "uploading-to-storage" };

export const UploadFlow = () => {
  const [upload, setUpload] = useState<UploadMachine>({ status: "idle" });
  const router = useRouter();
  const receiptId = upload.status === "done" ? upload.receiptId : null;
  const realtime = useReceiptRealtime({ receiptId });
  const state = realtime.messages.byTopic.state?.data.state;
  const refreshedRef = useRef({
    appeared: false,
    receiptId: null as string | null,
    terminal: false,
  });

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
        <CardHeader>
          <CardTitle>Upload Receipt</CardTitle>
          <CardDescription>
            Upload a receipt image to get AI-powered insights.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImageUploadCard
            onUploadComplete={(id) =>
              setUpload({ receiptId: id, status: "done" })
            }
            onUploadStateChange={(stage) => setUpload({ status: stage })}
          />
        </CardContent>
      </Card>
      {upload.status === "done" && <ReceiptToastNotifier realtime={realtime} />}
    </>
  );
};
