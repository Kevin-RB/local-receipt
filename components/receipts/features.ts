import {
  columnFilteringFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_datetime,
  tableFeatures,
} from "@tanstack/react-table";

export const features = tableFeatures({
  columnFilteringFeature,
  filterFns: { includesString: filterFn_includesString },
  filteredRowModel: createFilteredRowModel(),
  // Slices whatever filtering and sorting produced, so a page is a window onto
  // the whole filtered list rather than a slice taken before filtering.
  paginatedRowModel: createPaginatedRowModel(),
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    datetime: sortFn_datetime,
  },
  sortedRowModel: createSortedRowModel(),
});

export type DataTableFeatures = typeof features;
