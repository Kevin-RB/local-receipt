import { rowSelectionFeature, tableFeatures } from "@tanstack/react-table";

export const features = tableFeatures({
  rowSelectionFeature,
});

export type DataTableFeatures = typeof features;
