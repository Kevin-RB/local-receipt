"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { BadgeAlert, Eye, FileCheck } from "lucide-react";
import Link from "next/link";
import { z } from "zod/v4";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

export const receiptTableSchema = z.object({
  hasIntegrityWarning: z.boolean(),
  id: z.string(),
  merchantName: z.string(),
  paymentMethod: z.string(),
  receiptNumber: z.string(),
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

const columnHelper = createColumnHelper<ReceiptTable>();

export const receiptColumns = [
  columnHelper.accessor("status", {
    cell: ({ row }) => {
      const { status } = row.original;
      return <Badge variant={statusBadgeVariant[status]}>{status}</Badge>;
    },
    header: "Status",
  }),
  columnHelper.accessor("transactionDateTime", {
    cell: ({ row }) => {
      const { transactionDateTime } = row.original;
      // Parse the stored value into a Temporal Instant
      const instant = transactionDateTime.toTemporalInstant();
      return <div className="text-right">{dateFormatter.format(instant)}</div>;
    },
    header: "Date",
  }),
  columnHelper.accessor("merchantName", {
    header: "Merchant",
  }),
  columnHelper.accessor("receiptNumber", {
    header: "Receipt #",
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
    cell: ({ row }) => {
      const { id } = row.original;
      return (
        <Link
          className={buttonVariants({ size: "sm", variant: "outline" })}
          href={`/receipts/${id}`}
        >
          <Eye data-icon="inline-start" />
          View
        </Link>
      );
    },
    header: "Actions",
    id: "actions",
  }),
];
