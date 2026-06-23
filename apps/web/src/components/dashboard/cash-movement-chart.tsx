import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@tsu-stack/ui/components/chart";

type CashMovementChartDatum = {
  cashIn: number;
  cashOut: number;
  date: string;
};

type CashMovementChartProps = {
  config: ChartConfig;
  data: CashMovementChartDatum[];
};

export function CashMovementChart({ config, data }: CashMovementChartProps) {
  return (
    <ChartContainer config={config} className="aspect-auto h-[280px] w-full">
      <AreaChart
        accessibilityLayer
        data={data}
        margin={{
          left: 12,
          right: 12
        }}
      >
        <defs>
          <linearGradient id="cashInFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="5%" stopColor="var(--color-cashIn)" stopOpacity={0.8} />
            <stop offset="95%" stopColor="var(--color-cashIn)" stopOpacity={0.1} />
          </linearGradient>
          <linearGradient id="cashOutFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="5%" stopColor="var(--color-cashOut)" stopOpacity={0.45} />
            <stop offset="95%" stopColor="var(--color-cashOut)" stopOpacity={0.08} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis axisLine={false} dataKey="date" minTickGap={24} tickLine={false} tickMargin={8} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
        <Area
          dataKey="cashOut"
          fill="url(#cashOutFill)"
          fillOpacity={0.6}
          stroke="var(--color-cashOut)"
          type="natural"
        />
        <Area
          dataKey="cashIn"
          fill="url(#cashInFill)"
          fillOpacity={0.7}
          stroke="var(--color-cashIn)"
          type="natural"
        />
      </AreaChart>
    </ChartContainer>
  );
}
