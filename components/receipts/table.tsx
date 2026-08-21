"use client";

import { useTable } from "@tanstack/react-table";
import type { ColumnDef, RowData } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, CalendarIcon, ChevronsUpDown } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { features } from "@/components/receipts/features";
import type { DataTableFeatures } from "@/components/receipts/features";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DataTableProps<TData extends RowData> {
  columns: ColumnDef<DataTableFeatures, TData>[];
  data: TData[];
}

const SortIcon = ({ sorted }: { sorted: false | "asc" | "desc" }) => {
  if (sorted === "asc") {
    return <ArrowUp aria-hidden="true" className="size-3.5" />;
  }
  if (sorted === "desc") {
    return <ArrowDown aria-hidden="true" className="size-3.5" />;
  }
  return (
    <ChevronsUpDown
      aria-hidden="true"
      className="text-muted-foreground size-3.5"
    />
  );
};

const sortActionLabel = (sorted: false | "asc" | "desc") => {
  if (sorted === "asc") {
    return "Sort descending";
  }
  if (sorted === "desc") {
    return "Clear sorting";
  }
  return "Sort ascending";
};

const ARIA_SORT: Record<"asc" | "desc", "ascending" | "descending"> = {
  asc: "ascending",
  desc: "descending",
};

const rangeDateFormatter = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const today = new Date(Temporal.Now.instant().epochMilliseconds);

const startOfPreviousMonth = (() => {
  const previousMonth = Temporal.Now.plainDateISO().subtract({ months: 1 });
  return new Date(previousMonth.year, previousMonth.month - 1, 1);
})();

export const DataTable = <TData extends RowData>({
  columns,
  data,
}: DataTableProps<TData>) => {
  const table = useTable({
    columns,
    data,
    features,
  });
  const merchantColumn = table.getColumn("merchantName");
  const dateColumn = table.getColumn("transactionDateTime");
  const dateRange =
    (dateColumn?.getFilterValue() as DateRange | undefined) ?? undefined;

  const rangeLabel = (() => {
    if (!dateRange?.from) {
      return "Any date";
    }
    if (dateRange.to) {
      return `${rangeDateFormatter.format(dateRange.from)} - ${rangeDateFormatter.format(dateRange.to)}`;
    }
    return rangeDateFormatter.format(dateRange.from);
  })();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label="Filter by merchant"
          className="max-w-xs"
          onChange={(event) =>
            merchantColumn?.setFilterValue(event.target.value)
          }
          placeholder="Filter merchants…"
          value={(merchantColumn?.getFilterValue() as string | undefined) ?? ""}
        />
        <Popover>
          <PopoverTrigger
            aria-label="Filter by date range"
            render={
              <Button
                className="justify-start px-2.5 font-normal"
                id="date-range-filter"
                variant="outline"
              >
                <CalendarIcon data-icon="inline-start" />
                {rangeLabel}
              </Button>
            }
          />
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              defaultMonth={dateRange?.from ?? startOfPreviousMonth}
              disabled={{ after: today }}
              mode="range"
              numberOfMonths={2}
              onSelect={(next) => dateColumn?.setFilterValue(next ?? {})}
              selected={dateRange}
            />
            <div className="border-t p-1">
              <Button
                onClick={() => dateColumn?.setFilterValue(undefined)}
                size="sm"
                variant="ghost"
              >
                Clear dates
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  let content = <table.FlexRender header={header} />;
                  if (!header.isPlaceholder && header.column.getCanSort()) {
                    content = (
                      <button
                        className="hover:text-foreground flex items-center gap-1"
                        onClick={header.column.getToggleSortingHandler()}
                        type="button"
                      >
                        {content}
                        <SortIcon sorted={sorted} />
                        <span className="sr-only">
                          {sortActionLabel(sorted)}
                        </span>
                      </button>
                    );
                  }
                  return (
                    <TableHead
                      aria-sort={sorted ? ARIA_SORT[sorted] : undefined}
                      key={header.id}
                    >
                      {header.isPlaceholder ? null : content}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
