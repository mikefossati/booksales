"use client";

import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";

export type ProjectionPoint = {
  month: string;
  historico?: number;
  realista?: number;
  conservador?: number;
  optimista?: number;
};

function fmtY(v: number) {
  if (v === 0) return "";
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

const C_HIST  = "oklch(44% 0.13 155)";
const C_OPT   = "oklch(50% 0.17 145)";
const C_REAL  = "oklch(52% 0.14 220)";
const C_CONS  = "oklch(68% 0.15 75)";
const TOOLTIP_STYLE = {
  background: "oklch(99.5% 0.003 120)",
  border: "1px solid oklch(88% 0.02 140)",
  borderRadius: "8px",
  fontSize: 12,
  color: "oklch(16% 0.02 140)",
};

export default function ProjectionChart({
  data,
  splitAt,
}: {
  data: ProjectionPoint[];
  splitAt: string; // month label where projection starts
}) {
  const hasHistory = data.some(d => d.historico !== undefined && d.historico > 0);

  if (!hasHistory) {
    return (
      <div className="h-[240px] flex items-center justify-center text-sm text-[var(--color-text-muted)]">
        Sin datos históricos suficientes para proyectar
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <XAxis
          dataKey="month"
          tick={{ fontSize: 10, fill: "oklch(50% 0.03 140)" }}
          axisLine={false} tickLine={false}
        />
        <YAxis
          tickFormatter={fmtY}
          tick={{ fontSize: 10, fill: "oklch(50% 0.03 140)" }}
          axisLine={false} tickLine={false}
          width={52}
        />
        <Tooltip
          formatter={(v, name) => [fmtY(Number(v ?? 0)), String(name)]}
          contentStyle={TOOLTIP_STYLE}
        />
        <Legend
          iconType="line" iconSize={14}
          wrapperStyle={{ fontSize: 11, paddingTop: 8, color: "oklch(50% 0.03 140)" }}
        />
        <ReferenceLine
          x={splitAt}
          stroke="oklch(88% 0.02 140)"
          strokeDasharray="4 2"
          label={{ value: "hoy", position: "insideTopRight", fontSize: 9, fill: "oklch(50% 0.03 140)" }}
        />
        <Line dataKey="historico"   name="Histórico"   stroke={C_HIST} strokeWidth={2} dot={false} connectNulls />
        <Line dataKey="optimista"   name="Optimista"   stroke={C_OPT}  strokeWidth={1.5} dot={false} strokeDasharray="5 3" connectNulls />
        <Line dataKey="realista"    name="Realista"    stroke={C_REAL} strokeWidth={1.5} dot={false} strokeDasharray="5 3" connectNulls />
        <Line dataKey="conservador" name="Conservador" stroke={C_CONS} strokeWidth={1.5} dot={false} strokeDasharray="5 3" connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}
