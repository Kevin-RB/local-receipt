"use client";

import { isStaticToolUIPart } from "ai";
import { Gather } from "loading-dev";
import {
  BarChart3Icon,
  BrainIcon,
  HelpCircleIcon,
  ListIcon,
  ReceiptIcon,
  SearchIcon,
  StoreIcon,
  TriangleAlertIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import type {
  CategoryTotal,
  LineItemMatch,
  MerchantTotal,
  ReceiptDetail,
  ReceiptSummary,
} from "@/lib/chat/output-schemas";
import type { ChatMessagePart } from "@/lib/chat/tools";

import { formatAmount, formatDay } from "./format";
import { ResultTable } from "./parts/result-table";

const toolStateStatus = (
  state: Extract<ChatMessagePart, { type: `tool-${string}` }>["state"]
): "complete" | "active" | "pending" => {
  switch (state) {
    case "input-streaming":
    case "input-available": {
      return "active";
    }
    case "output-available":
    case "output-error": {
      return "complete";
    }
    default: {
      return "pending";
    }
  }
};

const useTimer = (running: boolean) => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!running) {
      return;
    }

    const interval = window.setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [running]);

  return seconds;
};

export const AskUserStep = ({
  part,
}: {
  part: Extract<ChatMessagePart, { type: "tool-ask_user" }>;
}) => {
  const status = toolStateStatus(part.state);

  if (part.state === "output-error") {
    return (
      <ChainOfThoughtStep
        icon={HelpCircleIcon}
        label="Question failed"
        status="complete"
      >
        <p className="text-destructive text-xs">{part.errorText}</p>
      </ChainOfThoughtStep>
    );
  }

  if (part.state !== "output-available") {
    return (
      <ChainOfThoughtStep
        icon={HelpCircleIcon}
        label="Asking you a question"
        status={status}
      />
    );
  }

  return (
    <ChainOfThoughtStep
      icon={HelpCircleIcon}
      label={`${part.output.length} answered`}
      status="complete"
    >
      <ol className="flex flex-col gap-1 text-xs">
        {part.output.map((entry) => (
          <li key={entry.question}>
            <span className="text-muted-foreground">{entry.question}</span>{" "}
            <span className="font-medium">{entry.answer}</span>
          </li>
        ))}
      </ol>
    </ChainOfThoughtStep>
  );
};

const ListReceiptsStep = ({
  part,
}: {
  part: Extract<ChatMessagePart, { type: "tool-list_receipts" }>;
}) => {
  const status = toolStateStatus(part.state);

  if (part.state === "output-error") {
    return (
      <ChainOfThoughtStep
        icon={ListIcon}
        label="Listing receipts failed"
        status="complete"
      >
        <p className="text-destructive text-xs">{part.errorText}</p>
      </ChainOfThoughtStep>
    );
  }

  if (part.state !== "output-available") {
    return (
      <ChainOfThoughtStep
        icon={ListIcon}
        label="Listing receipts"
        status={status}
      />
    );
  }

  return (
    <ChainOfThoughtStep
      icon={ListIcon}
      label={`Found ${part.output.length} receipts`}
      status="complete"
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
    </ChainOfThoughtStep>
  );
};

const ReceiptDetailStep = ({
  part,
}: {
  part: Extract<ChatMessagePart, { type: "tool-receipt_detail" }>;
}) => {
  const status = toolStateStatus(part.state);

  if (part.state === "output-error") {
    return (
      <ChainOfThoughtStep
        icon={ReceiptIcon}
        label="Reading receipt failed"
        status="complete"
      >
        <p className="text-destructive text-xs">{part.errorText}</p>
      </ChainOfThoughtStep>
    );
  }

  if (part.state !== "output-available") {
    return (
      <ChainOfThoughtStep
        icon={ReceiptIcon}
        label="Reading receipt"
        status={status}
      />
    );
  }

  const receipt = part.output;

  if (!receipt) {
    return (
      <ChainOfThoughtStep
        icon={ReceiptIcon}
        label="Receipt not found"
        status="complete"
      />
    );
  }

  type DetailItem = ReceiptDetail["items"][number];

  return (
    <ChainOfThoughtStep
      icon={ReceiptIcon}
      label={`${receipt.merchant ?? "Unknown merchant"} · ${formatDay(receipt.date)}`}
      status="complete"
    >
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span>{formatAmount(receipt.total)}</span>
        {receipt.paymentMethod ? <span>{receipt.paymentMethod}</span> : null}
        <Link
          className="hover:text-foreground inline-flex items-center gap-1"
          href={`/receipts/${receipt.id}`}
        >
          Open receipt
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
    </ChainOfThoughtStep>
  );
};

const largestTotal = (rows: CategoryTotal[]): number => {
  let largest = 0;
  for (const row of rows) {
    if (row.total > largest) {
      largest = row.total;
    }
  }
  return largest;
};

const SearchLineItemsStep = ({
  part,
}: {
  part: Extract<ChatMessagePart, { type: "tool-search_line_items" }>;
}) => {
  const status = toolStateStatus(part.state);

  if (part.state === "output-error") {
    return (
      <ChainOfThoughtStep
        icon={SearchIcon}
        label="Item search failed"
        status="complete"
      >
        <p className="text-destructive text-xs">{part.errorText}</p>
      </ChainOfThoughtStep>
    );
  }

  if (part.state !== "output-available") {
    return (
      <ChainOfThoughtStep
        icon={SearchIcon}
        label="Searching items"
        status={status}
      />
    );
  }

  const { count, items, total } = part.output;
  const query = part.input?.query;

  return (
    <ChainOfThoughtStep
      icon={SearchIcon}
      label={`${count} ${count === 1 ? "match" : "matches"}${query ? ` for “${query}”` : ""}`}
      status="complete"
    >
      {count > 0 ? (
        <p className="text-muted-foreground text-xs">
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
    </ChainOfThoughtStep>
  );
};

const SpendByCategoryStep = ({
  part,
}: {
  part: Extract<ChatMessagePart, { type: "tool-spend_by_category" }>;
}) => {
  const status = toolStateStatus(part.state);

  if (part.state === "output-error") {
    return (
      <ChainOfThoughtStep
        icon={BarChart3Icon}
        label="Category breakdown failed"
        status="complete"
      >
        <p className="text-destructive text-xs">{part.errorText}</p>
      </ChainOfThoughtStep>
    );
  }

  const scope = part.input?.category;
  const grouping =
    part.input?.groupBy === "category" ? "category" : "subcategory";
  const title = scope ?? `Totals by ${grouping}`;

  if (part.state !== "output-available") {
    return (
      <ChainOfThoughtStep icon={BarChart3Icon} label={title} status={status} />
    );
  }

  const { categories, total } = part.output;
  const largest = largestTotal(categories);

  return (
    <ChainOfThoughtStep
      icon={BarChart3Icon}
      label={`${title} · ${formatAmount(total)}`}
      status="complete"
    >
      <ResultTable
        caption={
          scope ? `Spend by ${grouping} in ${scope}` : `Spend by ${grouping}`
        }
        columns={[
          {
            header: "Category",
            render: (row: CategoryTotal) => (
              <span className="flex flex-col gap-1">
                {row.category}
                {largest > 0 ? (
                  <span
                    aria-hidden="true"
                    className="bg-muted h-0.5 w-full overflow-hidden rounded-full"
                    style={
                      { "--share": row.total / largest } as React.CSSProperties
                    }
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
    </ChainOfThoughtStep>
  );
};

const SpendByMerchantStep = ({
  part,
}: {
  part: Extract<ChatMessagePart, { type: "tool-spend_by_merchant" }>;
}) => {
  const status = toolStateStatus(part.state);

  if (part.state === "output-error") {
    return (
      <ChainOfThoughtStep
        icon={StoreIcon}
        label="Merchant totals failed"
        status="complete"
      >
        <p className="text-destructive text-xs">{part.errorText}</p>
      </ChainOfThoughtStep>
    );
  }

  if (part.state !== "output-available") {
    return (
      <ChainOfThoughtStep
        icon={StoreIcon}
        label="Totals by merchant"
        status={status}
      />
    );
  }

  const { merchants, total } = part.output;

  return (
    <ChainOfThoughtStep
      icon={StoreIcon}
      label={`Totals by merchant · ${formatAmount(total)}`}
      status="complete"
    >
      <ResultTable
        caption="Spend by merchant"
        columns={[
          {
            header: "Merchant",
            render: (row: MerchantTotal) => row.merchant,
          },
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
        rows={merchants}
        rowKey={(row) => row.merchant}
      />
    </ChainOfThoughtStep>
  );
};

const unreachableToolPart = (part: never): never => {
  throw new Error(`Unhandled tool part: ${JSON.stringify(part)}`);
};

const AgentStep = ({ part }: { part: ChatMessagePart }) => {
  if (!isStaticToolUIPart(part)) {
    return null;
  }

  switch (part.type) {
    case "tool-ask_user": {
      return <AskUserStep part={part} />;
    }
    case "tool-list_receipts": {
      return <ListReceiptsStep part={part} />;
    }
    case "tool-receipt_detail": {
      return <ReceiptDetailStep part={part} />;
    }
    case "tool-search_line_items": {
      return <SearchLineItemsStep part={part} />;
    }
    case "tool-spend_by_category": {
      return <SpendByCategoryStep part={part} />;
    }
    case "tool-spend_by_merchant": {
      return <SpendByMerchantStep part={part} />;
    }
    default: {
      return unreachableToolPart(part);
    }
  }
};

export const AgentSteps = ({
  isStreaming,
  parts,
}: {
  isStreaming: boolean;
  parts: ChatMessagePart[];
}) => {
  const seconds = useTimer(isStreaming);
  const steps = parts.filter((part): part is ChatMessagePart =>
    isStaticToolUIPart(part)
  );
  const hasActiveReasoning = parts.some(
    (part) => part.type === "reasoning" && part.state === "streaming"
  );

  if (steps.length === 0 && !hasActiveReasoning) {
    return null;
  }

  return (
    <ChainOfThought defaultOpen={isStreaming}>
      <ChainOfThoughtHeader>
        <span className="flex items-center gap-2">
          <Gather
            color="var(--primary)"
            key={isStreaming ? "streaming" : "done"}
            playState={isStreaming ? "running" : "paused"}
            size={14}
          />
          Working
          <span className="text-muted-foreground tabular-nums">{seconds}s</span>
        </span>
      </ChainOfThoughtHeader>
      <ChainOfThoughtContent>
        {steps.map((part, index) => (
          <AgentStep key={`${part.type}-${index}`} part={part} />
        ))}
        {hasActiveReasoning && isStreaming ? (
          <ChainOfThoughtStep
            icon={BrainIcon}
            label="Thinking"
            status="active"
          />
        ) : null}
      </ChainOfThoughtContent>
    </ChainOfThought>
  );
};
