import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { buildChartConfig, type UserColorEntry } from "./chartColors";
import type { DailyActiveRow } from "@/hooks/useEngagement";

interface Props {
  data: DailyActiveRow[];
  userColorMap: Map<string, UserColorEntry>;
}

export default function DailySessionChart({ data, userColorMap }: Props) {
  const { chartData, userKeys, chartConfig } = useMemo(() => {
    // Group by (activity_date, user) → sum active_minutes across pages
    const dateUserMap = new Map<string, Map<string, number>>();

    for (const row of data) {
      if (!dateUserMap.has(row.activity_date)) {
        dateUserMap.set(row.activity_date, new Map());
      }
      const userMap = dateUserMap.get(row.activity_date)!;
      const entry = userColorMap.get(row.user_id);
      if (!entry) continue;
      userMap.set(entry.key, (userMap.get(entry.key) ?? 0) + row.active_minutes);
    }

    const keys = [...new Set(
      data
        .map((r) => userColorMap.get(r.user_id)?.key)
        .filter((k): k is string => !!k)
    )];

    const sortedDates = [...dateUserMap.keys()].sort();

    const chartData = sortedDates.map((date) => {
      const entry: Record<string, unknown> = { date };
      const userMap = dateUserMap.get(date)!;
      for (const key of keys) {
        entry[key] = Math.round((userMap.get(key) ?? 0) * 10) / 10;
      }
      return entry;
    });

    return {
      chartData,
      userKeys: keys,
      chartConfig: buildChartConfig(userColorMap),
    };
  }, [data, userColorMap]);

  if (chartData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
        No daily activity data available
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(d) => format(parseISO(d), "MMM d")}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(label) => format(parseISO(label as string), "MMM d, yyyy")}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        {userKeys.map((key) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={`var(--color-${key})`}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}
