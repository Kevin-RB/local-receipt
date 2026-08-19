"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sumSpending } from "@/lib/overview";
import type { SpendingInput, SpendingPeriod } from "@/lib/overview";

type RangeKey = "30-days" | "2-months" | "3-months";

const RANGE_LABELS: Record<RangeKey, string> = {
  "2-months": "2 months",
  "3-months": "3 months",
  "30-days": "30 days",
};

const RANGE_PERIODS: Record<RangeKey, SpendingPeriod> = {
  "2-months": { count: 2, granularity: "month" },
  "3-months": { count: 3, granularity: "month" },
  "30-days": { count: 30, granularity: "day" },
};

const RANGE_ITEMS = Object.entries(RANGE_LABELS).map(([value, label]) => ({
  label,
  value,
}));

const chartConfig = {
  total: {
    color: "var(--chart-1)",
    label: "Total",
  },
} satisfies ChartConfig;

const currencyFormatter = new Intl.NumberFormat("en-AU", {
  currency: "AUD",
  style: "currency",
});

const formatDayTick = (value: unknown) =>
  Temporal.PlainDate.from(String(value)).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
  });

const formatMonthTick = (value: unknown) =>
  Temporal.PlainYearMonth.from(String(value))
    .toPlainDate({ day: 1 })
    .toLocaleString("en-AU", { month: "short" });

const formatDayTooltipLabel = (value: unknown) =>
  Temporal.PlainDate.from(String(value)).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    weekday: "short",
  });

const formatMonthTooltipLabel = (value: unknown) =>
  Temporal.PlainYearMonth.from(String(value))
    .toPlainDate({ day: 1 })
    .toLocaleString("en-AU", { month: "long", year: "numeric" });

export const SpendingChart = ({ receipts }: { receipts: SpendingInput[] }) => {
  const [range, setRange] = useState<RangeKey>("30-days");

  const data = useMemo(
    () => sumSpending(receipts, RANGE_PERIODS[range]),
    [receipts, range]
  );
  const { granularity } = RANGE_PERIODS[range];

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-start justify-between">
        <div className="flex flex-col gap-1">
          <CardTitle>Spending</CardTitle>
          <CardDescription>
            Total spent in the last {RANGE_LABELS[range]}
          </CardDescription>
        </div>
        <Select
          items={RANGE_ITEMS}
          onValueChange={(value) => setRange(value as RangeKey)}
          value={range}
        >
          <SelectTrigger aria-label="Spending period" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {Object.entries(RANGE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <BarChart
            accessibilityLayer
            data={data}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="label"
              minTickGap={32}
              tickFormatter={(value) =>
                granularity === "day"
                  ? formatDayTick(value)
                  : formatMonthTick(value)
              }
              tickLine={false}
              tickMargin={8}
            />
            <YAxis
              axisLine={false}
              tickFormatter={(value) => currencyFormatter.format(Number(value))}
              tickLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => currencyFormatter.format(Number(value))}
                  labelFormatter={(value) =>
                    granularity === "day"
                      ? formatDayTooltipLabel(value)
                      : formatMonthTooltipLabel(value)
                  }
                />
              }
            />
            <Bar dataKey="total" fill="var(--color-total)" />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
