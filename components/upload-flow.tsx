"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ImageUploadCard } from "./image-upload-card";

type UploadState =
  | "idle"
  | "requesting-url"
  | "uploading-to-minio"
  | "done"
  | "error";

export const UploadFlow = () => {
  const router = useRouter();
  const [state, setState] = useState<UploadState>("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
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
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Upload failed");
      }

      const { uploadUrl } = (await res.json()) as { uploadUrl: string };

      setState("uploading-to-minio");

      const putRes = await fetch(uploadUrl, {
        body: file,
        headers: { "Content-Type": file.type },
        method: "PUT",
      });

      if (!putRes.ok) {
        throw new Error("Failed to upload image to storage");
      }

      setState("done");
      router.push("/receipts");
    } catch (error) {
      setState("error");
      setUploadError(error instanceof Error ? error.message : "Upload failed");
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <ImageUploadCard onFileSelect={handleFileSelect} />
      {state === "requesting-url" && (
        <p className="text-sm text-muted-foreground">Preparing upload...</p>
      )}
      {state === "uploading-to-minio" && (
        <p className="text-sm text-muted-foreground">Uploading image...</p>
      )}
      {state === "done" && (
        <p className="text-sm text-green-600">
          Upload complete! Redirecting...
        </p>
      )}
      {state === "error" && uploadError && (
        <p className="text-sm text-red-600">{uploadError}</p>
      )}
    </div>
  );
};
