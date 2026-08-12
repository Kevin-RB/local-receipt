import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { findReceiptByIdWithItems } from "@/lib/db";
import type { ReceiptSelect } from "@/lib/db/schema/receipt";
import { cn } from "@/lib/utils";

import { ReceiptEditForm } from "./receipt-edit-form";

interface ReceiptDetailPageProps {
  params: Promise<{ id: string }>;
}

const statusBadgeVariant: Record<
  ReceiptSelect["status"],
  "default" | "destructive" | "outline" | "secondary"
> = {
  done: "default",
  error: "destructive",
  pending: "secondary",
  processing: "secondary",
  uploading: "secondary",
};

const ReceiptImage = ({
  hasImage,
  receiptId,
  className,
}: {
  hasImage: boolean;
  receiptId: string;
  className?: string;
}) => (
  <div
    className={cn(
      "relative min-h-[400px] rounded-lg border bg-muted",
      className
    )}
  >
    {hasImage ? (
      <Image
        alt="Receipt image"
        className="object-contain p-4"
        fill
        sizes="(max-width: 1024px) 100vw, 50vw"
        src={`/api/receipts/${receiptId}/image`}
      />
    ) : (
      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
        No image available
      </div>
    )}
  </div>
);

export default async function ReceiptDetailPage({
  params,
}: ReceiptDetailPageProps) {
  const { id } = await params;
  const receipt = await findReceiptByIdWithItems(id);

  if (!receipt) {
    notFound();
  }

  const isEditable = receipt.status === "done";

  return (
    <main className="container mx-auto p-6">
      <div className="mb-6 flex items-center gap-3">
        <Link
          aria-label="Back to receipts"
          className="text-muted-foreground hover:text-foreground"
          href="/"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-bold">Receipt Details</h1>
        <Badge variant={statusBadgeVariant[receipt.status]}>
          {receipt.status}
        </Badge>
      </div>

      {isEditable ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <ReceiptImage
            className="lg:min-h-0 lg:h-[calc(100dvh-5rem)] lg:self-start lg:sticky lg:top-6"
            hasImage={!!receipt.minioObjectKey}
            receiptId={receipt.id}
          />
          <ReceiptEditForm receipt={receipt} />
        </div>
      ) : (
        <ReceiptImage
          className="lg:min-h-0 lg:h-[calc(100dvh-5rem)]"
          hasImage={!!receipt.minioObjectKey}
          receiptId={receipt.id}
        />
      )}
    </main>
  );
}
