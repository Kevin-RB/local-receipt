"use client";

import { useMemo } from "react";
import { Label, PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import type { IntegrityInput } from "@/lib/overview";

const chartConfig = {
  warnings: {
    color: "var(--destructive)",
    label: "Integrity warnings",
  },
} satisfies ChartConfig;

interface CenterLabelProps {
  warnings: number;
  viewBox?: {
    cx?: number;
    cy?: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
}

const CenterLabel = ({ warnings, viewBox }: CenterLabelProps) => {
  const cx = viewBox?.cx ?? (viewBox?.x ?? 0) + (viewBox?.width ?? 0) / 2;
  const cy = viewBox?.cy ?? (viewBox?.y ?? 0) + (viewBox?.height ?? 0) / 2;
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} y={cy} className="fill-foreground text-4xl font-bold">
        {warnings.toLocaleString()}
      </tspan>
      <tspan x={cx} y={cy + 24} className="fill-muted-foreground">
        Flagged
      </tspan>
    </text>
  );
};

export const IntegrityChart = ({
  receipts,
}: {
  receipts: IntegrityInput[];
}) => {
  const warnings = useMemo(
    () => receipts.filter((receipt) => receipt.hasIntegrityWarning).length,
    [receipts]
  );
  const total = receipts.length;

  const data = [{ name: "warnings", warnings }];

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Integrity</CardTitle>
        <CardDescription>Matching vs. flagged receipts</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <RadialBarChart
            data={data}
            startAngle={0}
            endAngle={360}
            outerRadius={90}
            innerRadius={75}
          >
            <RadialBar
              background
              dataKey="warnings"
              fill="var(--color-warnings)"
            />
            <PolarAngleAxis
              type="number"
              domain={[0, Math.max(total, 1)]}
              tick={false}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Label
              position="center"
              content={<CenterLabel warnings={warnings} />}
            />
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 leading-none font-medium">
          {warnings.toLocaleString()} of {total.toLocaleString()} flagged
        </div>
        <div className="leading-none text-muted-foreground">
          Line items do not sum to the stated total
        </div>
      </CardFooter>
    </Card>
  );
};
