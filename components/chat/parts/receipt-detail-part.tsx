"use client";

import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";

import type { ReceiptDetail } from "@/lib/chat/output-schemas";
import type { ReceiptDetailToolPart } from "@/lib/chat/tools";

import { formatAmount, formatDay } from "../format";
import { ResultTable } from "./result-table";
import { ToolResult } from "./tool-result";

type DetailItem = ReceiptDetail["items"][number];

export const ReceiptDetailPart = ({
  part,
}: {
  part: ReceiptDetailToolPart;
}) => {
  if (part.state !== "output-available") {
    return (
      <ToolResult
        errorText={part.state === "output-error" ? part.errorText : undefined}
        isPending={part.state !== "output-error"}
        label="Reading a receipt"
      />
    );
  }

  const receipt = part.output;

  if (!receipt) {
    return (
      <p className="text-muted-foreground px-1 text-xs">
        That receipt could not be found.
      </p>
    );
  }

  return (
    <ToolResult
      isPending={false}
      label={`${receipt.merchant ?? "Unknown merchant"} · ${formatDay(receipt.date)}`}
    >
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-xs">
        <span>{formatAmount(receipt.total)}</span>
        {receipt.paymentMethod ? <span>{receipt.paymentMethod}</span> : null}
        <Link
          className="hover:text-foreground inline-flex items-center gap-1"
          href={`/receipts/${receipt.id}`}
        >
          Open receipt
          <ExternalLinkIcon className="size-3" />
        </Link>
      </div>
      <ResultTable
        caption="Line items"
        columns={[
          {
            header: "Item",
            render: (row: DetailItem) => (
              <span className="flex items-baseline gap-1.5">
                {row.name}
                {row.kind === "product" ? null : (
                  <span className="text-muted-foreground text-xs uppercase">
                    {row.kind}
                  </span>
                )}
              </span>
            ),
          },
          {
            align: "end",
            header: "Qty",
            render: (row: DetailItem) =>
              row.quantity === null ? "—" : row.quantity,
          },
          {
            align: "end",
            header: "Total",
            render: (row: DetailItem) => formatAmount(row.lineTotal),
          },
        ]}
        empty="No line items were captured for this receipt."
        rows={receipt.items}
        rowKey={(row, index) => `${index}-${row.name}`}
      />
    </ToolResult>
  );
};
