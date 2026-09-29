"use client";

import { Button } from "@/components/ui/button";

const SUGGESTIONS = [
  {
    label: "Biggest expense this month",
    prompt: "What was my biggest single expense this month?",
  },
  {
    label: "Grocery spending",
    prompt: "How much did I spend on groceries over the last 3 months?",
  },
  {
    label: "Top merchants",
    prompt: "Which merchants did I spend the most at last month?",
  },
  {
    label: "Find an item",
    prompt: "How much have I spent on cheese in the last 6 months?",
  },
];

export const Suggestions = ({
  onSelect,
}: {
  onSelect: (prompt: string) => void;
}) => (
  <div className="flex flex-wrap justify-center gap-2">
    {SUGGESTIONS.map((suggestion) => (
      <Button
        key={suggestion.label}
        onClick={() => onSelect(suggestion.prompt)}
        size="sm"
        type="button"
        variant="outline"
      >
        {suggestion.label}
      </Button>
    ))}
  </div>
);
