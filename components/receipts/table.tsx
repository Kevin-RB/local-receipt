"use client";

import { useTable } from "@tanstack/react-table";
import type { ColumnDef, RowData } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

import { features } from "@/components/receipts/features";
import type { DataTableFeatures } from "@/components/receipts/features";
import { Input } from "@/components/ui/input";
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

  return (
    <div className="flex flex-col gap-2">
      <div>
        <Input
          aria-label="Filter by merchant"
          className="max-w-xs"
          onChange={(event) =>
            merchantColumn?.setFilterValue(event.target.value)
          }
          placeholder="Filter merchants…"
          value={(merchantColumn?.getFilterValue() as string | undefined) ?? ""}
        />
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
