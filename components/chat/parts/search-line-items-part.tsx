"use client";

import Link from "next/link";

import type { LineItemMatch } from "@/lib/chat/output-schemas";
import type { SearchLineItemsToolPart } from "@/lib/chat/tools";

import { formatAmount, formatDay } from "../format";
import { ResultTable } from "./result-table";
import { ToolResult } from "./tool-result";

export const SearchLineItemsPart = ({
  part,
}: {
  part: SearchLineItemsToolPart;
}) => {
  if (part.state !== "output-available") {
    return (
      <ToolResult
        errorText={part.state === "output-error" ? part.errorText : undefined}
        isPending={part.state !== "output-error"}
        label="Searching items"
      />
    );
  }

  const { count, items, total } = part.output;
  const query = part.input?.query;

  return (
    <ToolResult
      isPending={false}
      label={`${count} ${count === 1 ? "match" : "matches"}${query ? ` for “${query}”` : ""}`}
    >
      {count > 0 ? (
        <p className="text-muted-foreground px-1 text-xs">
          {formatAmount(total)} across products
        </p>
      ) : null}
      <ResultTable
        caption="Matching items"
        columns={[
          {
            header: "Item",
            render: (row: LineItemMatch) => (
              <span className="flex flex-col">
                {row.item}
                {row.category ? (
                  <span className="text-muted-foreground text-xs">
                    {row.category}
                  </span>
                ) : null}
              </span>
            ),
          },
          {
            header: "Merchant",
            render: (row: LineItemMatch) => (
              <Link
                className="hover:text-foreground"
                href={`/receipts/${row.receiptId}`}
              >
                {row.merchant ?? "Unknown"}
              </Link>
            ),
          },
          {
            header: "Date",
            render: (row: LineItemMatch) => formatDay(row.date),
          },
          {
            align: "end",
            header: "Total",
            render: (row: LineItemMatch) => formatAmount(row.lineTotal),
          },
        ]}
        empty="Nothing matched that search."
        rows={items}
        rowKey={(row, index) => `${row.receiptId}-${index}-${row.item}`}
      />
    </ToolResult>
  );
};
