"use client";

import { ImagePlusIcon, UploadIcon } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = ["image/jpeg", "image/png"] as const;
const ACCEPTED_LABEL = "JPEG or PNG";

export const ImageUploadCard = ({
  className,
  onFileSelect,
}: {
  className?: string;
  onFileSelect?: (file: File) => void;
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (selected: File) => {
    if (
      !ACCEPTED_TYPES.includes(selected.type as (typeof ACCEPTED_TYPES)[number])
    ) {
      return;
    }

    setPreview(URL.createObjectURL(selected));
    onFileSelect?.(selected);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      handleFile(selected);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      handleFile(dropped);
    }
  };

  const openPicker = () => inputRef.current?.click();

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader>
        <CardTitle>Upload Receipt</CardTitle>
        <CardDescription>
          Upload a receipt image to get AI-powered insights.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
          className={cn(
            "flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-none border-2 border-dashed border-muted-foreground/40 bg-muted/50 p-8 transition-colors hover:border-muted-foreground/60 hover:bg-muted",
            isDragOver && "border-primary bg-muted"
          )}
        >
          {preview ? (
            <Image
              src={preview}
              alt="Receipt preview"
              width={0}
              height={0}
              className="max-h-48 w-auto object-contain"
            />
          ) : (
            <>
              <ImagePlusIcon className="size-10 text-muted-foreground" />
              <div className="flex flex-col items-center gap-1 text-center">
                <span className="text-xs font-medium">
                  Click to browse or drag and drop
                </span>
                <span className="text-xs text-muted-foreground">
                  {ACCEPTED_LABEL}
                </span>
              </div>
            </>
          )}
        </button>
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={openPicker}>
          <UploadIcon data-icon="inline-start" />
          Browse
        </Button>
        <span className="text-xs text-muted-foreground">
          {ACCEPTED_LABEL} &middot; 2000&times;2000px max
        </span>
      </CardFooter>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={handleChange}
        className="sr-only"
        aria-label="Upload receipt image"
      />
    </Card>
  );
};
