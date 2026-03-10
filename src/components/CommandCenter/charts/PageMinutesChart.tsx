import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { buildChartConfig, type UserColorEntry } from "./chartColors";
import type { DailyActiveRow } from "@/hooks/useEngagement";

const MAX_PAGES = 10;

interface Props {
  data: DailyActiveRow[];
  userColorMap: Map<string, UserColorEntry>;
}

export default function PageMinutesChart({ data, userColorMap }: Props) {
  const { chartData, userKeys, chartConfig } = useMemo(() => {
    // Group by (page_title, user) → sum active_minutes across dates
    const pageUserMap = new Map<string, Map<string, number>>();
    const pageTotals = new Map<string, number>();

    for (const row of data) {
      const entry = userColorMap.get(row.user_id);
      if (!entry) continue;

      if (!pageUserMap.has(row.page_title)) {
        pageUserMap.set(row.page_title, new Map());
      }
      const userMap = pageUserMap.get(row.page_title)!;
      userMap.set(entry.key, (userMap.get(entry.key) ?? 0) + row.active_minutes);
      pageTotals.set(row.page_title, (pageTotals.get(row.page_title) ?? 0) + row.active_minutes);
    }

    // Sort pages by total descending, take top N
    const sortedPages = [...pageTotals.entries()]
      .sort((a, b) => b[1] - a[1]);

    const topPages = sortedPages.slice(0, MAX_PAGES).map(([p]) => p);

    // Aggregate remaining pages into "(Other)" if needed
    if (sortedPages.length > MAX_PAGES) {
      const otherUserMap = new Map<string, number>();
      for (const [page] of sortedPages.slice(MAX_PAGES)) {
        const userMap = pageUserMap.get(page)!;
        for (const [key, mins] of userMap) {
          otherUserMap.set(key, (otherUserMap.get(key) ?? 0) + mins);
        }
      }
      pageUserMap.set("(Other)", otherUserMap);
      topPages.push("(Other)");
    }

    const keys = [...new Set(
      data
        .map((r) => userColorMap.get(r.user_id)?.key)
        .filter((k): k is string => !!k)
    )];

    const chartData = topPages.map((page) => {
      const entry: Record<string, unknown> = { page };
      const userMap = pageUserMap.get(page)!;
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
        No page activity data available
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="page"
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          interval={0}
          angle={-35}
          textAnchor="end"
          height={60}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {userKeys.map((key) => (
          <Bar
            key={key}
            dataKey={key}
            stackId="a"
            fill={`var(--color-${key})`}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
