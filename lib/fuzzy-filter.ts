import { compareItems, rankItem } from "@tanstack/match-sorter-utils";
import type { RankingInfo } from "@tanstack/match-sorter-utils";
import { sortFn_alphanumeric } from "@tanstack/react-table";
import type {
  FilterFn,
  RowData,
  SortFn,
  TableFeatures,
} from "@tanstack/react-table";

export interface FuzzyFilterMeta {
  itemRank?: RankingInfo;
}

type FuzzyFeatures = TableFeatures & { filterMeta: FuzzyFilterMeta };

export const fuzzyFilter: FilterFn<FuzzyFeatures, RowData> = (
  row,
  columnId,
  value,
  addMeta
) => {
  const itemRank = rankItem(row.getValue(columnId), value);
  addMeta?.({ itemRank });
  return itemRank.passed;
};

export const fuzzySort: SortFn<FuzzyFeatures, RowData> = (
  rowA,
  rowB,
  columnId
) => {
  const rankA = rowA.columnFiltersMeta[columnId]?.itemRank;
  const rankB = rowB.columnFiltersMeta[columnId]?.itemRank;

  if (rankA && rankB) {
    const dir = compareItems(rankA, rankB);
    if (dir !== 0) {
      return dir;
    }
  }

  return sortFn_alphanumeric(rowA, rowB, columnId);
};
