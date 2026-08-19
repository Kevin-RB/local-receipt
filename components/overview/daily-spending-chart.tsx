"use client";

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
import type { DailySpending } from "@/lib/overview";

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

const xAxisTickFormatter = (value: unknown) =>
  Temporal.PlainDate.from(String(value)).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
  });

const tooltipLabelFormatter = (value: unknown) =>
  Temporal.PlainDate.from(String(value)).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    weekday: "short",
  });

export const DailySpendingChart = ({ data }: { data: DailySpending[] }) => (
  <Card className="w-full">
    <CardHeader>
      <CardTitle>Daily spending</CardTitle>
      <CardDescription>Total spent in the last 30 days</CardDescription>
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
            tickFormatter={xAxisTickFormatter}
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
              <ChartTooltipContent labelFormatter={tooltipLabelFormatter} />
            }
          />
          <Bar dataKey="total" fill="var(--color-total)" />
        </BarChart>
      </ChartContainer>
    </CardContent>
  </Card>
);
