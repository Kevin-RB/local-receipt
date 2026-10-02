"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface ResultColumn<TRow> {
  align?: "start" | "end";
  header: string;
  render: (row: TRow) => React.ReactNode;
}

/**
 * A table of tool output. The transcript is already narrow and these numbers
 * are supporting evidence for the prose answer above, so the table keeps the
 * shadcn defaults and adds only numeric alignment — no zebra striping, no
 * custom chrome.
 */
export const ResultTable = <TRow,>({
  caption,
  columns,
  empty,
  rows,
  rowKey,
}: {
  caption: string;
  columns: ResultColumn<TRow>[];
  empty: string;
  rows: TRow[];
  rowKey: (row: TRow, index: number) => string;
}) => {
  if (rows.length === 0) {
    return <p className="text-muted-foreground px-1 text-xs">{empty}</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table aria-label={caption}>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                className={column.align === "end" ? "text-right" : undefined}
                key={column.header}
                scope="col"
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={rowKey(row, index)}>
              {columns.map((column) => (
                <TableCell
                  className={cn(
                    "align-baseline",
                    column.align === "end" && "text-right"
                  )}
                  key={column.header}
                >
                  {column.render(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
