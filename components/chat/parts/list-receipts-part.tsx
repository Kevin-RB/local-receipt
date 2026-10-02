"use client";

import { TriangleAlertIcon } from "lucide-react";
import Link from "next/link";

import type { ReceiptSummary } from "@/lib/chat/output-schemas";
import type { ListReceiptsToolPart } from "@/lib/chat/tools";

import { formatAmount, formatDay } from "../format";
import { ResultTable } from "./result-table";
import { ToolResult } from "./tool-result";

export const ListReceiptsPart = ({ part }: { part: ListReceiptsToolPart }) => {
  if (part.state !== "output-available") {
    return (
      <ToolResult
        errorText={part.state === "output-error" ? part.errorText : undefined}
        isPending={part.state !== "output-error"}
        label="Listing receipts"
      />
    );
  }

  return (
    <ToolResult
      isPending={false}
      label={`Found ${part.output.length} receipts`}
    >
      <ResultTable
        caption="Receipts"
        columns={[
          {
            header: "Merchant",
            render: (row: ReceiptSummary) => (
              <Link
                className="hover:text-foreground"
                href={`/receipts/${row.id}`}
              >
                {row.merchant ?? "Unknown"}
              </Link>
            ),
          },
          {
            header: "Date",
            render: (row: ReceiptSummary) => formatDay(row.date),
          },
          {
            align: "end",
            header: "Total",
            render: (row: ReceiptSummary) => formatAmount(row.total),
          },
          {
            align: "end",
            header: "",
            render: (row: ReceiptSummary) =>
              row.hasIntegrityWarning ? (
                <TriangleAlertIcon
                  aria-label="Failed total check"
                  className="text-destructive size-3.5"
                />
              ) : null,
          },
        ]}
        empty="No receipts matched that filter."
        rows={part.output}
        rowKey={(row) => row.id}
      />
    </ToolResult>
  );
};
