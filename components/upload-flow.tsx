"use client";

import { useState } from "react";

import { ReceiptToastNotifier } from "@/components/receipt-toast-notifier";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { ImageUploadCard } from "./image-upload-card";

type UploadMachine =
  | { status: "done"; receiptId: string }
  | { status: "idle" }
  | { status: "requesting-url" }
  | { status: "uploading-to-minio" };

export const UploadFlow = () => {
  const [upload, setUpload] = useState<UploadMachine>({ status: "idle" });

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
            onUploadComplete={(receiptId) =>
              setUpload({ receiptId, status: "done" })
            }
            onUploadStateChange={(stage) => setUpload({ status: stage })}
          />
        </CardContent>
        {/* <CardFooter className="flex flex-col items-start gap-2">
          {upload.status === "requesting-url" && (
            <p className="text-sm text-muted-foreground">Preparing upload...</p>
          )}
          {upload.status === "uploading-to-minio" && (
            <p className="text-sm text-muted-foreground">Uploading image...</p>
          )}
        </CardFooter> */}
      </Card>
      {upload.status === "done" && (
        <ReceiptToastNotifier receiptId={upload.receiptId} />
      )}
    </>
  );
};
