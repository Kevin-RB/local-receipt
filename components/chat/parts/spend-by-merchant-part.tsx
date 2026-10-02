"use client";

import type { MerchantTotal } from "@/lib/chat/output-schemas";
import type { SpendByMerchantToolPart } from "@/lib/chat/tools";

import { formatAmount } from "../format";
import { ResultTable } from "./result-table";
import { ToolResult } from "./tool-result";

export const SpendByMerchantPart = ({
  part,
}: {
  part: SpendByMerchantToolPart;
}) => {
  if (part.state !== "output-available") {
    return (
      <ToolResult
        errorText={part.state === "output-error" ? part.errorText : undefined}
        isPending={part.state !== "output-error"}
        label="Totals by merchant"
      />
    );
  }

  const { output: rows } = part;

  return (
    <ToolResult isPending={false} label="Totals by merchant">
      <ResultTable
        caption="Spend by merchant"
        columns={[
          { header: "Merchant", render: (row: MerchantTotal) => row.merchant },
          {
            align: "end",
            header: "Receipts",
            render: (row: MerchantTotal) => row.receipts,
          },
          {
            align: "end",
            header: "Total",
            render: (row: MerchantTotal) => formatAmount(row.total),
          },
        ]}
        empty="No receipts in that period."
        rows={rows}
        rowKey={(row) => row.merchant}
      />
    </ToolResult>
  );
};
