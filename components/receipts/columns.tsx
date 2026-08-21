"use client";

import { createColumnHelper } from "@tanstack/react-table";
import {
  BadgeAlert,
  Eye,
  FileCheck,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod/v4";

import { deleteReceipt } from "@/app/receipts/actions";
import type { DataTableFeatures } from "@/components/receipts/features";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";

export const receiptTableSchema = z.object({
  hasIntegrityWarning: z.boolean(),
  id: z.string(),
  merchantName: z.string(),
  paymentMethod: z.string(),
  status: z.enum(["uploading", "pending", "processing", "done", "error"]),
  total: z.number(),
  transactionDateTime: z.date(),
});

export type ReceiptTable = z.infer<typeof receiptTableSchema>;

type badgeVariant = "default" | "destructive" | "outline" | "secondary";

const statusBadgeVariant: Record<ReceiptTable["status"], badgeVariant> = {
  done: "default",
  error: "destructive",
  pending: "secondary",
  processing: "secondary",
  uploading: "secondary",
};

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Australia/Brisbane",
});

const columnHelper = createColumnHelper<DataTableFeatures, ReceiptTable>();

const RowActions = ({
  id,
  merchantName,
}: {
  id: string;
  merchantName: string;
}) => {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const result = await deleteReceipt(id);
      if (result.success) {
        setConfirmOpen(false);
        toast.add({ title: "Receipt deleted", type: "success" });
        router.refresh();
      } else {
        toast.add({
          description: result.error,
          title: "Delete failed",
          type: "error",
        });
      }
    } catch {
      toast.add({
        description: "Something went wrong deleting the receipt",
        title: "Delete failed",
        type: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Open row actions"
          className={buttonVariants({ size: "icon", variant: "ghost" })}
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem render={<Link href={`/receipts/${id}`} />}>
            <Eye data-icon="inline-start" />
            View
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 data-icon="inline-start" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete receipt?</DialogTitle>
            <DialogDescription>
              This will permanently remove the receipt
              {merchantName ? ` from ${merchantName}` : ""} and its image. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setConfirmOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button
              disabled={deleting}
              onClick={handleDelete}
              variant="destructive"
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const receiptColumns = columnHelper.columns([
  columnHelper.accessor("status", {
    cell: ({ row }) => {
      const { status } = row.original;
      return <Badge variant={statusBadgeVariant[status]}>{status}</Badge>;
    },
    header: "Status",
    sortFn: "alphanumeric",
  }),
  columnHelper.accessor("transactionDateTime", {
    cell: ({ row }) => {
      const { transactionDateTime } = row.original;
      const instant = transactionDateTime.toTemporalInstant();
      return <div className="text-right">{dateFormatter.format(instant)}</div>;
    },
    header: "Date",
    sortFn: "datetime",
  }),
  columnHelper.accessor("merchantName", {
    header: "Merchant",
    sortFn: "alphanumeric",
  }),
  columnHelper.accessor("total", {
    cell: ({ row }) => {
      const { total } = row.original;
      const formattedAmount = new Intl.NumberFormat("en-AU", {
        currency: "AUD",
        style: "currency",
      }).format(total);

      return <div className="text-right font-medium">{formattedAmount}</div>;
    },
    header: "Total",
  }),
  columnHelper.accessor("paymentMethod", {
    header: "Payment",
    sortFn: "alphanumeric",
  }),
  columnHelper.accessor("hasIntegrityWarning", {
    cell: ({ row }) => {
      const { hasIntegrityWarning } = row.original;

      if (hasIntegrityWarning) {
        return (
          <Badge variant="destructive">
            <BadgeAlert data-icon="inline-start" />
            Integrity
          </Badge>
        );
      }

      return (
        <Badge className="text-center" variant="ghost">
          <FileCheck data-icon="inline-start" />
          Matching
        </Badge>
      );
    },
    header: "Integrity",
  }),
  columnHelper.display({
    cell: ({ row }) => (
      <RowActions
        id={row.original.id}
        merchantName={row.original.merchantName}
      />
    ),
    header: "",
    id: "actions",
  }),
]);
