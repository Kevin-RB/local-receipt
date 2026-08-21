import type { DateRange } from "react-day-picker";

import { receiptDateToISODateString } from "@/lib/receipt/datetime";

export type DateRangeFilterValue = Partial<DateRange>;

interface FilterableRow {
  getValue: (columnId: string) => unknown;
}

export const dateRangeFilterFn = (
  row: FilterableRow,
  columnId: string,
  value: DateRangeFilterValue
): boolean => {
  const { from, to } = value;
  if (!from && !to) {
    return true;
  }
  const raw = row.getValue(columnId);
  if (!(raw instanceof Date)) {
    return false;
  }
  const dateString = receiptDateToISODateString(raw);
  if (from && dateString < receiptDateToISODateString(from)) {
    return false;
  }
  if (to && dateString > receiptDateToISODateString(to)) {
    return false;
  }
  return true;
};
