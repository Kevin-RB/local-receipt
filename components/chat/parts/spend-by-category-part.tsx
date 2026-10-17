"use client";

import type { CSSProperties } from "react";

import type { CategoryTotal } from "@/lib/chat/output-schemas";
import type { SpendByCategoryToolPart } from "@/lib/chat/tools";

import { formatAmount } from "../format";
import { ResultTable } from "./result-table";
import { ToolResult } from "./tool-result";

const largestTotal = (rows: CategoryTotal[]): number => {
  let largest = 0;
  for (const row of rows) {
    if (row.total > largest) {
      largest = row.total;
    }
  }
  return largest;
};

export const SpendByCategoryPart = ({
  part,
}: {
  part: SpendByCategoryToolPart;
}) => {
  // The tool rolls rows up either way, so the label names which one the table
  // shows — CONTEXT.md keeps "category" (top-level) and "subcategory" (leaf)
  // distinct, and a leaf line item is what is actually assigned.
  const groupsTopLevel = part.input?.groupBy === "category";
  const label = groupsTopLevel ? "Totals by category" : "Totals by subcategory";

  if (part.state !== "output-available") {
    return (
      <ToolResult
        errorText={part.state === "output-error" ? part.errorText : undefined}
        isPending={part.state !== "output-error"}
        label={label}
      />
    );
  }

  const { categories, total } = part.output;
  const largest = largestTotal(categories);

  return (
    <ToolResult isPending={false} label={`${label} · ${formatAmount(total)}`}>
      <ResultTable
        caption={groupsTopLevel ? "Spend by category" : "Spend by subcategory"}
        columns={[
          {
            header: "Category",
            render: (row: CategoryTotal) => (
              <span className="flex flex-col gap-1">
                {row.category}
                {largest > 0 ? (
                  // The share is passed as the `--share` custom property
                  // because Tailwind cannot express a value only known at
                  // runtime; the `.share-bar` rule in `globals.css` reads it.
                  // Hidden from assistive tech — the amount beside it is the
                  // accessible value.
                  <span
                    aria-hidden="true"
                    className="bg-muted h-0.5 w-full overflow-hidden rounded-full"
                    style={{ "--share": row.total / largest } as CSSProperties}
                  >
                    <span className="share-bar bg-primary/40 block h-full w-full origin-left" />
                  </span>
                ) : null}
              </span>
            ),
          },
          {
            align: "end",
            header: "Total",
            render: (row: CategoryTotal) => formatAmount(row.total),
          },
        ]}
        empty="No categorised spend in that period."
        rows={categories}
        rowKey={(row) => row.category}
      />
    </ToolResult>
  );
};
