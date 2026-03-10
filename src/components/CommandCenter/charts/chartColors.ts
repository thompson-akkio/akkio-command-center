import type { ChartConfig } from "@/components/ui/chart";

const CHART_COLORS = [
  "hsl(187, 80%, 48%)", // chart-1: cyan
  "hsl(152, 60%, 45%)", // chart-2: green
  "hsl(38, 92%, 55%)",  // chart-3: amber
  "hsl(280, 60%, 55%)", // chart-4: purple
  "hsl(0, 72%, 55%)",   // chart-5: red
  "hsl(210, 70%, 55%)", // blue
  "hsl(330, 65%, 55%)", // pink
  "hsl(60, 70%, 45%)",  // olive
  "hsl(190, 50%, 65%)", // light teal
  "hsl(25, 80%, 50%)",  // orange
];

export interface UserColorEntry {
  key: string;
  label: string;
  color: string;
}

/**
 * Builds a stable color mapping for users, sorted alphabetically by display name.
 */
export function buildUserColorMap(
  users: Array<{ userId: string; email: string | null }>
): Map<string, UserColorEntry> {
  const sorted = [...users].sort((a, b) => {
    const nameA = a.email?.split("@")[0] ?? a.userId;
    const nameB = b.email?.split("@")[0] ?? b.userId;
    return nameA.localeCompare(nameB);
  });

  const map = new Map<string, UserColorEntry>();
  const usedKeys = new Set<string>();

  sorted.forEach((user, i) => {
    const name = user.email?.split("@")[0] ?? user.userId;
    let key = name.replace(/[^a-zA-Z0-9_-]/g, "_");
    // Handle duplicate keys
    if (usedKeys.has(key)) {
      key = `${key}_${i}`;
    }
    usedKeys.add(key);

    map.set(user.userId, {
      key,
      label: name,
      color: CHART_COLORS[i % CHART_COLORS.length],
    });
  });

  return map;
}

/**
 * Converts user color map to a ChartConfig for the shadcn ChartContainer.
 */
export function buildChartConfig(
  userColorMap: Map<string, UserColorEntry>
): ChartConfig {
  const config: ChartConfig = {};
  for (const entry of userColorMap.values()) {
    config[entry.key] = {
      label: entry.label,
      color: entry.color,
    };
  }
  return config;
}
