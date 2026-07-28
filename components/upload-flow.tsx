"use client";

import { useState } from "react";
import { z } from "zod/v4";

import { ReceiptLiveTracker } from "@/components/receipt-live-tracker";
import { ACCEPTED_MIME_TYPES } from "@/lib/minio/constants";

import { ImageUploadCard } from "./image-upload-card";

type UploadStage = "requesting-url" | "uploading-to-minio" | "done";

class UploadError extends Error {
  stage: UploadStage;
  constructor(stage: UploadStage, message: string) {
    super(message);
    this.name = "UploadError";
    this.stage = stage;
  }
}

const UploadResponse = z.object({
  receiptId: z.string(),
  uploadUrl: z.string(),
});

type UploadState = "idle" | UploadStage | "error";

export const UploadFlow = () => {
  const [state, setState] = useState<UploadState>("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    if (
      !ACCEPTED_MIME_TYPES.includes(
        file.type as (typeof ACCEPTED_MIME_TYPES)[number]
      )
    ) {
      setState("error");
      setUploadError(
        `Unsupported file type: ${file.type || "unknown"}. Please select a JPEG or PNG image.`
      );
      return;
    }

    setState("requesting-url");
    setUploadError(null);

    try {
      const res = await fetch("/api/upload", {
        body: JSON.stringify({
          contentType: file.type,
          fileSize: file.size,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!res.ok) {
        throw new UploadError(
          "requesting-url",
          `Upload request failed (${res.status} ${res.statusText})`
        );
      }

      const raw = await res.json();
      const parsed = UploadResponse.safeParse(raw);
      if (!parsed.success) {
        throw new UploadError(
          "requesting-url",
          "Invalid response from upload endpoint"
        );
      }

      const { receiptId: id, uploadUrl } = parsed.data;
      setReceiptId(id);

      setState("uploading-to-minio");

      const putRes = await fetch(uploadUrl, {
        body: file,
        headers: { "Content-Type": file.type },
        method: "PUT",
      });

      if (!putRes.ok) {
        throw new UploadError(
          "uploading-to-minio",
          "Failed to upload image to storage"
        );
      }

      setState("done");
    } catch (error) {
      setState("error");
      setUploadError(error instanceof Error ? error.message : "Upload failed");
    }
  };

  if (state === "done" && receiptId) {
    return (
      <div className="flex flex-col items-center gap-4 w-full max-w-md">
        <p className="text-sm text-green-600">Upload complete!</p>
        <ReceiptLiveTracker receiptId={receiptId} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <ImageUploadCard onFileSelect={handleFileSelect} />
      {state === "requesting-url" && (
        <p className="text-sm text-muted-foreground">Preparing upload...</p>
      )}
      {state === "uploading-to-minio" && (
        <p className="text-sm text-muted-foreground">Uploading image...</p>
      )}
      {state === "error" && uploadError && (
        <p className="text-sm text-red-600">{uploadError}</p>
      )}
    </div>
  );
};
