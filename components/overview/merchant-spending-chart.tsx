"use client";

import { useMemo } from "react";
import { Pie, PieChart, Sector } from "recharts";
import type {
  PieLabelRenderProps,
  PieSectorShapeProps,
  TooltipPayloadEntry,
  TooltipValueType,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ChartConfig } from "@/components/ui/chart";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { sumSpendingByMerchant } from "@/lib/overview";
import type { MerchantSpendingInput } from "@/lib/overview";

const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const currencyFormatter = new Intl.NumberFormat("en-AU", {
  currency: "AUD",
  style: "currency",
});

interface MerchantSpendingDatum {
  fill: string;
  label: string;
  percent: number;
  total: number;
}

const formatTooltipValue = (
  value: TooltipValueType | undefined,
  name: number | string | undefined,
  item: TooltipPayloadEntry<TooltipValueType, number | string>
) => (
  <div className="flex w-full items-center justify-between gap-4">
    <div className="flex items-center gap-2">
      <div
        className="h-2.5 w-2.5 shrink-0 rounded-xs"
        style={{ backgroundColor: item.payload.fill }}
      />
      <span className="text-muted-foreground">{name}</span>
    </div>
    <span className="font-medium text-foreground tabular-nums">
      {currencyFormatter.format(Number(value))}
    </span>
  </div>
);

const renderPercentLabel = (props: PieLabelRenderProps) => (
  <text
    cx={props.cx}
    cy={props.cy}
    dominantBaseline={props.dominantBaseline}
    fill="var(--foreground)"
    textAnchor={props.textAnchor}
    x={props.x}
    y={props.y}
  >
    {Math.round((props.percent ?? 0) * 100)}%
  </text>
);

const renderSector = (props: PieSectorShapeProps) => (
  <Sector {...props} fill={props.payload.fill} />
);

export const MerchantSpendingChart = ({
  receipts,
}: {
  receipts: MerchantSpendingInput[];
}) => {
  const { chartConfig, data } = useMemo(() => {
    const buckets = sumSpendingByMerchant(receipts);
    const sum = buckets.reduce((total, bucket) => total + bucket.total, 0);

    const entries: MerchantSpendingDatum[] = buckets.map((bucket, index) => ({
      fill: PALETTE[index % PALETTE.length],
      label: bucket.label,
      percent: sum === 0 ? 0 : bucket.total / sum,
      total: bucket.total,
    }));

    const config: ChartConfig = Object.fromEntries(
      entries.map(({ label }) => [label, { label }])
    );

    return { chartConfig: config, data: entries };
  }, [receipts]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Spending by merchant</CardTitle>
        <CardDescription>Share of total spent per merchant</CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-75 w-full"
        >
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent formatter={formatTooltipValue} hideLabel />
              }
            />
            <Pie
              cx="50%"
              cy="50%"
              data={data}
              dataKey="total"
              label={renderPercentLabel}
              labelLine={false}
              nameKey="label"
              shape={renderSector}
              strokeWidth={5}
            />
            <ChartLegend content={<ChartLegendContent nameKey="label" />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
