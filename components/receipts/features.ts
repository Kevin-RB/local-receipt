import {
  columnFilteringFeature,
  createFilteredRowModel,
  createSortedRowModel,
  metaHelper,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_datetime,
  tableFeatures,
} from "@tanstack/react-table";

import type { FuzzyFilterMeta } from "@/lib/fuzzy-filter";
import { fuzzyFilter, fuzzySort } from "@/lib/fuzzy-filter";

export const features = tableFeatures({
  columnFilteringFeature,
  filterFns: { fuzzy: fuzzyFilter },
  filterMeta: metaHelper<FuzzyFilterMeta>(),
  filteredRowModel: createFilteredRowModel(),
  rowSelectionFeature,
  rowSortingFeature,
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    datetime: sortFn_datetime,
    fuzzy: fuzzySort,
  },
  sortedRowModel: createSortedRowModel(),
});

export type DataTableFeatures = typeof features;
