"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlusIcon } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod/v4";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { ACCEPTED_LABEL, ACCEPTED_MIME_TYPES } from "@/lib/minio/constants";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  receipt: z
    .file()
    .min(1, "Please select a file")
    .mime([...ACCEPTED_MIME_TYPES], "Invalid file type"),
});

type FormValues = z.infer<typeof formSchema>;
type UploadStage = "requesting-url" | "uploading-to-minio";

const UploadResponse = z.object({
  receiptId: z.string(),
  uploadUrl: z.string(),
});

class UploadError extends Error {
  stage: UploadStage;
  constructor(stage: UploadStage, message: string) {
    super(message);
    this.name = "UploadError";
    this.stage = stage;
  }
}

export const ImageUploadCard = ({
  className,
  onUploadComplete,
  onUploadStateChange,
}: {
  className?: string;
  onUploadComplete?: (receiptId: string) => void;
  onUploadStateChange?: (stage: UploadStage) => void;
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    defaultValues: { receipt: undefined as File | undefined },
    mode: "onSubmit",
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormValues) => {
    const file = data.receipt;

    onUploadStateChange?.("requesting-url");

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

      const { receiptId, uploadUrl } = parsed.data;

      onUploadStateChange?.("uploading-to-minio");

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

      onUploadComplete?.(receiptId);
    } catch (error) {
      form.setError("receipt", {
        message: error instanceof Error ? error.message : "Upload failed",
      });
    }
  };

  const handleFile = async (file: File) => {
    setPreview(URL.createObjectURL(file));
    form.setValue("receipt", file);
    const valid = await form.trigger("receipt");
    if (valid) {
      form.handleSubmit(onSubmit)();
    }
    return valid;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      void handleFile(selected);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      void handleFile(dropped);
    }
  };

  const openPicker = () => {
    if (!form.formState.isSubmitting) {
      inputRef.current?.click();
    }
  };

  return (
    <form
      id="upload-form"
      onSubmit={form.handleSubmit(onSubmit)}
      className={cn("contents", className)}
    >
      <FieldGroup>
        <Controller
          name="receipt"
          control={form.control}
          render={({ fieldState, field }) => {
            const { onBlur: handleBlur } = field;
            return (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="receipt-input">
                  <FieldDescription>
                    {ACCEPTED_LABEL} &middot; 2000&times;2000px max
                  </FieldDescription>
                </FieldLabel>
                <button
                  type="button"
                  onClick={openPicker}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                  }}
                  onDrop={handleDrop}
                  disabled={form.formState.isSubmitting}
                  className={cn(
                    "flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-none border-2 border-dashed border-border bg-card p-8 transition-colors hover:border-accent-accent hover:bg-muted",
                    isDragOver && "border-primary bg-muted",
                    form.formState.isSubmitting &&
                      "cursor-not-allowed opacity-50"
                  )}
                >
                  {preview ? (
                    <Image
                      src={preview}
                      alt="Receipt preview"
                      width={400}
                      height={400}
                      className="max-h-48 w-auto object-contain"
                    />
                  ) : (
                    <>
                      <ImagePlusIcon className="size-10 text-muted-foreground" />
                      <div className="flex flex-col items-center gap-1 text-center">
                        <span className="text-xs font-medium">
                          Click to browse or drag and drop
                        </span>
                      </div>
                    </>
                  )}
                </button>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
                <input
                  ref={inputRef}
                  name={field.name}
                  onBlur={handleBlur}
                  type="file"
                  accept={ACCEPTED_MIME_TYPES.join(",")}
                  onChange={(e) => {
                    field.onChange(e.target.files?.[0]);
                    handleChange(e);
                  }}
                  className="sr-only"
                  aria-label="Upload receipt image"
                  aria-invalid={fieldState.invalid}
                  disabled={form.formState.isSubmitting}
                />
                {/* <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openPicker}
                  disabled={form.formState.isSubmitting}
                >
                  <UploadIcon data-icon="inline-start" />
                  Browse
                </Button>
              </div> */}
              </Field>
            );
          }}
        />
      </FieldGroup>
    </form>
  );
};
