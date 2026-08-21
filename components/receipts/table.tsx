"use client";

import { useTable } from "@tanstack/react-table";
import type { ColumnDef, RowData } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown, Search } from "lucide-react";

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

export const DataTable = <TData extends RowData>({
  columns,
  data,
}: DataTableProps<TData>) => {
  const table = useTable({
    columns,
    data,
    features,
    getColumnCanGlobalFilter: (column) => column.id !== "actions",
    globalFilterFn: "fuzzy",
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          className="pl-8"
          onChange={(event) => table.setGlobalFilter(event.target.value)}
          placeholder="Search receipts…"
          value={(table.state.globalFilter as string | undefined) ?? ""}
        />
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  let content = <table.FlexRender header={header} />;
                  if (!header.isPlaceholder && header.column.getCanSort()) {
                    content = (
                      <button
                        className="hover:text-foreground flex items-center gap-1"
                        onClick={header.column.getToggleSortingHandler()}
                        type="button"
                      >
                        {content}
                        <SortIcon sorted={header.column.getIsSorted()} />
                      </button>
                    );
                  }
                  return (
                    <TableHead key={header.id}>
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
