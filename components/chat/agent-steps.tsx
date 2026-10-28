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
import type { ReactNode } from "react";

import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace";
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

const plural = (count: number, singular: string, pluralForm: string) =>
  `${count} ${count === 1 ? singular : pluralForm}`;

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

/**
 * One step of the trace. A step with output is a `TraceCollapsible`: the line
 * sits in the trigger and the detail (a table, a list, an error) sits in the
 * content, below and indented. A step with nothing to show is a plain line.
 *
 * Titles are written in the tense the status implies (present while running,
 * past when done, "Failed to …" on error) so the line is readable on its own.
 */
const Step = ({
  children,
  description,
  icon,
  status,
  title,
}: {
  children?: ReactNode;
  description?: ReactNode;
  icon: ReactNode;
  status?: "running" | "error" | "pending";
  title: string;
}) => {
  const line = (
    <TraceLine aria-live={status ? "polite" : "off"} status={status}>
      <TraceIcon>{icon}</TraceIcon>
      <TraceTitle>{title}</TraceTitle>
      {description === undefined ? null : (
        <TraceDescription>{description}</TraceDescription>
      )}
    </TraceLine>
  );

  if (children === undefined) {
    return line;
  }

  return (
    <TraceCollapsible defaultOpen>
      <TraceCollapsibleTrigger>{line}</TraceCollapsibleTrigger>
      <TraceCollapsibleContent>{children}</TraceCollapsibleContent>
    </TraceCollapsible>
  );
};

export const AskUserStep = ({
  part,
}: {
  part: Extract<ChatMessagePart, { type: "tool-ask_user" }>;
}) => {
  if (part.state === "output-error") {
    return (
      <Step
        icon={<HelpCircleIcon />}
        status="error"
        title="Failed to ask a question"
      >
        <p className="text-destructive text-xs">{part.errorText}</p>
      </Step>
    );
  }

  if (part.state !== "output-available") {
    return (
      <Step
        icon={<HelpCircleIcon />}
        status="running"
        title="Asking you a question"
      />
    );
  }

  const count = part.output.length;

  return (
    <Step
      icon={<HelpCircleIcon />}
      title={`Answered ${plural(count, "question", "questions")}`}
    >
      <ol className="flex flex-col gap-1 text-xs">
        {part.output.map((entry) => (
          <li key={entry.question}>
            <span className="text-muted-foreground">{entry.question}</span>{" "}
            <span className="font-medium">{entry.answer}</span>
          </li>
        ))}
      </ol>
    </Step>
  );
};

const ListReceiptsStep = ({
  part,
}: {
  part: Extract<ChatMessagePart, { type: "tool-list_receipts" }>;
}) => {
  if (part.state === "output-error") {
    return (
      <Step icon={<ListIcon />} status="error" title="Failed to list receipts">
        <p className="text-destructive text-xs">{part.errorText}</p>
      </Step>
    );
  }

  if (part.state !== "output-available") {
    return (
      <Step icon={<ListIcon />} status="running" title="Listing receipts" />
    );
  }

  const count = part.output.length;

  return (
    <Step
      icon={<ListIcon />}
      title={
        count === 0
          ? "Found no receipts"
          : `Found ${plural(count, "receipt", "receipts")}`
      }
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
    </Step>
  );
};

const ReceiptDetailStep = ({
  part,
}: {
  part: Extract<ChatMessagePart, { type: "tool-receipt_detail" }>;
}) => {
  if (part.state === "output-error") {
    return (
      <Step
        icon={<ReceiptIcon />}
        status="error"
        title="Failed to read receipt"
      >
        <p className="text-destructive text-xs">{part.errorText}</p>
      </Step>
    );
  }

  if (part.state !== "output-available") {
    return (
      <Step icon={<ReceiptIcon />} status="running" title="Reading receipt" />
    );
  }

  const receipt = part.output;

  if (!receipt) {
    return <Step icon={<ReceiptIcon />} title="Receipt not found" />;
  }

  type DetailItem = ReceiptDetail["items"][number];

  return (
    <Step
      description={formatDay(receipt.date)}
      icon={<ReceiptIcon />}
      title={
        receipt.merchant
          ? `Read the ${receipt.merchant} receipt`
          : "Read the receipt"
      }
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
    </Step>
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
  if (part.state === "output-error") {
    return (
      <Step icon={<SearchIcon />} status="error" title="Failed to search items">
        <p className="text-destructive text-xs">{part.errorText}</p>
      </Step>
    );
  }

  if (part.state !== "output-available") {
    return (
      <Step icon={<SearchIcon />} status="running" title="Searching items" />
    );
  }

  const { count, items, total } = part.output;
  const query = part.input?.query;
  const found =
    count === 0
      ? "Found no matches"
      : `Found ${plural(count, "match", "matches")}`;

  return (
    <Step
      icon={<SearchIcon />}
      title={`${found}${query ? ` for “${query}”` : ""}`}
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
    </Step>
  );
};

const SpendByCategoryStep = ({
  part,
}: {
  part: Extract<ChatMessagePart, { type: "tool-spend_by_category" }>;
}) => {
  if (part.state === "output-error") {
    return (
      <Step
        icon={<BarChart3Icon />}
        status="error"
        title="Failed to total spend by category"
      >
        <p className="text-destructive text-xs">{part.errorText}</p>
      </Step>
    );
  }

  const scope = part.input?.category;
  const grouping =
    part.input?.groupBy === "category" ? "category" : "subcategory";
  const subject = scope ? `${scope} spend` : `spend by ${grouping}`;

  if (part.state !== "output-available") {
    return (
      <Step
        icon={<BarChart3Icon />}
        status="running"
        title={`Totalling ${subject}`}
      />
    );
  }

  const { categories, total } = part.output;
  const largest = largestTotal(categories);

  return (
    <Step
      description={formatAmount(total)}
      icon={<BarChart3Icon />}
      title={`Totalled ${subject}`}
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
    </Step>
  );
};

const SpendByMerchantStep = ({
  part,
}: {
  part: Extract<ChatMessagePart, { type: "tool-spend_by_merchant" }>;
}) => {
  if (part.state === "output-error") {
    return (
      <Step
        icon={<StoreIcon />}
        status="error"
        title="Failed to total spend by merchant"
      >
        <p className="text-destructive text-xs">{part.errorText}</p>
      </Step>
    );
  }

  if (part.state !== "output-available") {
    return (
      <Step
        icon={<StoreIcon />}
        status="running"
        title="Totalling spend by merchant"
      />
    );
  }

  const { merchants, total } = part.output;

  return (
    <Step
      description={formatAmount(total)}
      icon={<StoreIcon />}
      title="Totalled spend by merchant"
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
    </Step>
  );
};

const unreachableToolPart = (part: never): never => {
  throw new Error(`Unhandled tool part: ${JSON.stringify(part)}`);
};

const StepLine = ({ part }: { part: ChatMessagePart }) => {
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
  const [open, setOpen] = useState<boolean>();
  const seconds = useTimer(isStreaming);
  const steps = parts.filter(
    (part): part is Extract<ChatMessagePart, { type: `tool-${string}` }> =>
      part.type.startsWith("tool-")
  );
  const hasActiveReasoning = parts.some(
    (part) => part.type === "reasoning" && part.state === "streaming"
  );

  if (steps.length === 0 && !hasActiveReasoning) {
    return null;
  }

  const failed = steps.some((part) => part.state === "output-error");

  let headerStatus: "running" | "error" | undefined;
  if (isStreaming) {
    headerStatus = "running";
  } else if (failed) {
    headerStatus = "error";
  } else {
    headerStatus = undefined;
  }

  return (
    <TraceCollapsible open={open ?? isStreaming} onOpenChange={setOpen}>
      <TraceCollapsibleTrigger>
        <TraceLine status={headerStatus}>
          <TraceIcon>
            <Gather
              color="var(--primary)"
              key={isStreaming ? "streaming" : "done"}
              playState={isStreaming ? "running" : "paused"}
              size={14}
            />
          </TraceIcon>
          <TraceTitle>Working</TraceTitle>
          <TraceDescription>{seconds}s</TraceDescription>
        </TraceLine>
      </TraceCollapsibleTrigger>
      <TraceCollapsibleContent keepMounted>
        <Trace>
          {steps.map((part, index) => (
            <StepLine key={`${part.type}-${index}`} part={part} />
          ))}
          {hasActiveReasoning && isStreaming ? (
            <TraceLine aria-live="polite" status="running">
              <TraceIcon>
                <BrainIcon />
              </TraceIcon>
              <TraceTitle>Thinking</TraceTitle>
            </TraceLine>
          ) : null}
        </Trace>
      </TraceCollapsibleContent>
    </TraceCollapsible>
  );
};
