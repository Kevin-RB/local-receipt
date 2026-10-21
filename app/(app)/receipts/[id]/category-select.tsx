"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CategoryOptionGroup } from "@/lib/category/options";
import {
  flattenCategoryOptions,
  UNCATEGORISED_CATEGORY,
  UNCATEGORISED_LABEL,
} from "@/lib/category/options";

interface CategorySelectProps {
  groups: CategoryOptionGroup[];
  onValueChange: (value: string | null) => void;
  value: string;
}

/**
 * Picks a category for a line item from the app taxonomy. An item the
 * categorization pass could not classify shows as "Uncategorised", which is the
 * signal that a human decision is still outstanding.
 */
export const CategorySelect = ({
  groups,
  onValueChange,
  value,
}: CategorySelectProps) => (
  // `items` is what lets the trigger render the selected option's name; the
  // popup is grouped for scanning, but the trigger shows a bare label.
  <Select
    items={[
      { label: UNCATEGORISED_LABEL, value: UNCATEGORISED_CATEGORY },
      ...flattenCategoryOptions(groups),
    ]}
    onValueChange={onValueChange}
    value={value}
  >
    <SelectTrigger aria-label="Category" className="w-full">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        <SelectItem value={UNCATEGORISED_CATEGORY}>
          {UNCATEGORISED_LABEL}
        </SelectItem>
      </SelectGroup>
      {groups.map((group) => (
        <SelectGroup key={group.label}>
          <SelectLabel>{group.label}</SelectLabel>
          {group.options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      ))}
    </SelectContent>
  </Select>
);
