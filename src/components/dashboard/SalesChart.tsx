"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

export type ChartRow = {
  month: string;
  Digital: number;
  Librerías: number;
  Directo: number;
};

function fmtY(v: number) {
  if (v === 0) return "";
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

// Use literal oklch values — CSS vars don't reliably resolve inside SVG fill attrs
const C_DIGITAL   = "oklch(44% 0.13 155)"; // sage accent
const C_BOOKSTORE = "oklch(52% 0.14 220)"; // teal
const C_DIRECT    = "oklch(68% 0.15 75)";  // amber

export default function SalesChart({ data }: { data: ChartRow[] }) {
  const hasData = data.some(d => d.Digital + d.Librerías + d.Directo > 0);

  if (!hasData) {
    return (
      <div className="h-[200px] flex items-center justify-center text-sm text-[var(--color-text-muted)]">
        Sin ventas en los últimos 12 meses
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barSize={12} barCategoryGap="30%">
        <XAxis
          dataKey="month"
          tick={{ fontSize: 10, fill: "oklch(50% 0.03 140)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={fmtY}
          tick={{ fontSize: 10, fill: "oklch(50% 0.03 140)" }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip
          formatter={(v, name) => [fmtY(Number(v ?? 0)), String(name)]}
          contentStyle={{
            background:   "oklch(99.5% 0.003 120)",
            border:       "1px solid oklch(88% 0.02 140)",
            borderRadius: "8px",
            fontSize:     12,
            color:        "oklch(16% 0.02 140)",
          }}
          cursor={{ fill: "oklch(93% 0.04 155)", opacity: 0.4 }}
        />
        <Legend
          iconType="square"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, paddingTop: 8, color: "oklch(50% 0.03 140)" }}
        />
        <Bar dataKey="Digital"   stackId="a" fill={C_DIGITAL}   radius={[0, 0, 0, 0]} />
        <Bar dataKey="Librerías" stackId="a" fill={C_BOOKSTORE} radius={[0, 0, 0, 0]} />
        <Bar dataKey="Directo"   stackId="a" fill={C_DIRECT}    radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
