"use client";

import { useMemo } from "react";
import {
  Label,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import type { IntegrityInput } from "@/lib/overview";

const chartConfig = {
  warnings: {
    color: "var(--destructive)",
    label: "Integrity warnings",
  },
} satisfies ChartConfig;

interface CenterLabelProps {
  total: number;
  viewBox?: { cx?: number; cy?: number };
}

const CenterLabel = ({ total, viewBox }: CenterLabelProps) => {
  if (!viewBox || viewBox.cx === undefined || viewBox.cy === undefined) {
    return null;
  }
  const { cx, cy } = viewBox;
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} y={cy} className="fill-foreground text-4xl font-bold">
        {total.toLocaleString()}
      </tspan>
      <tspan x={cx} y={cy + 24} className="fill-muted-foreground">
        Receipts
      </tspan>
    </text>
  );
};

export const IntegrityChart = ({
  receipts,
}: {
  receipts: IntegrityInput[];
}) => {
  const { total, warnings } = useMemo(
    () => ({
      total: receipts.length,
      warnings: receipts.filter((receipt) => receipt.hasIntegrityWarning)
        .length,
    }),
    [receipts]
  );

  const data = [{ name: "receipts", warnings }];

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Integrity</CardTitle>
        <CardDescription>Completed receipts vs. flagged ones</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-70"
        >
          <RadialBarChart
            data={data}
            endAngle={100}
            innerRadius={65}
            outerRadius={95}
          >
            <PolarGrid
              gridType="circle"
              radialLines={false}
              stroke="none"
              className={
                warnings === 0
                  ? "first:fill-chart-1 last:fill-background"
                  : "first:fill-muted last:fill-background"
              }
              polarRadius={[86, 74]}
            />
            <RadialBar dataKey="warnings" fill="var(--destructive)" />
            <PolarRadiusAxis
              domain={[0, Math.max(total, 1)]}
              tick={false}
              tickLine={false}
              axisLine={false}
            >
              <Label content={<CenterLabel total={total} />} />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 leading-none font-medium">
          {warnings.toLocaleString()} of {total.toLocaleString()}{" "}
          {total === 1 ? "receipt has" : "receipts have"} integrity warnings
        </div>
        <div className="leading-none text-muted-foreground">
          Line items do not sum to the stated total
        </div>
      </CardFooter>
    </Card>
  );
};
