import {
  columnFilteringFeature,
  constructFilterFn,
  createFilteredRowModel,
  createSortedRowModel,
  globalFilteringFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_datetime,
  tableFeatures,
} from "@tanstack/react-table";

const normalize = (value: unknown) => String(value ?? "").toLowerCase();

export const filterFn_fuzzy = constructFilterFn({
  autoRemove: (filterValue) => !filterValue,
  filter: (dataValue, filterValue) => {
    const haystack = normalize(dataValue);
    const needle = normalize(filterValue);
    let index = 0;
    for (const char of needle) {
      index = haystack.indexOf(char, index);
      if (index === -1) {
        return false;
      }
      index += 1;
    }
    return true;
  },
  resolveDataValue: normalize,
  resolveFilterValue: normalize,
});

export const features = tableFeatures({
  columnFilteringFeature,
  filterFns: { fuzzy: filterFn_fuzzy },
  filteredRowModel: createFilteredRowModel(),
  globalFilteringFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFns: { alphanumeric: sortFn_alphanumeric, datetime: sortFn_datetime },
  sortedRowModel: createSortedRowModel(),
});

export type DataTableFeatures = typeof features;
