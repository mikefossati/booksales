"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function fmt(n: number, currency: string) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency", currency,
    maximumFractionDigits: currency === "CLP" ? 0 : 2,
  }).format(n);
}

export default function GoalCalculator({
  currentMonthRevenue,
  avg3Month,
  currency,
}: {
  currentMonthRevenue: number;
  avg3Month: number;
  currency: string;
}) {
  const [goal, setGoal] = useState("");

  const goalNum  = parseFloat(goal.replace(/[^0-9.]/g, "")) || 0;
  const progress = goalNum > 0 ? Math.min((currentMonthRevenue / goalNum) * 100, 100) : 0;
  const monthsToReach = goalNum > 0 && avg3Month > 0
    ? Math.ceil(goalNum / avg3Month)
    : null;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5 max-w-xs">
        <Label htmlFor="goal-input">Meta mensual de ingresos</Label>
        <Input
          id="goal-input"
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          value={goal}
          onChange={e => setGoal(e.target.value)}
          placeholder={currency === "CLP" ? "500000" : "1000"}
        />
      </div>

      {goalNum > 0 && (
        <div className="space-y-3">
          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <p className="text-xs text-[var(--color-text-muted)]">Progreso este mes</p>
              <p className="text-xs font-semibold text-[var(--color-text)]">{progress.toFixed(0)}%</p>
            </div>
            <div className="h-2.5 rounded-full bg-[var(--color-border)] overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all ${progress >= 100 ? "bg-[var(--color-success)]" : "bg-[var(--color-accent)]"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-[var(--color-text-muted)]">{fmt(currentMonthRevenue, currency)}</span>
              <span className="text-xs text-[var(--color-text-muted)]">{fmt(goalNum, currency)}</span>
            </div>
          </div>

          {avg3Month > 0 && monthsToReach !== null && (
            <p className="text-sm text-[var(--color-text-muted)]">
              Al ritmo actual{" "}
              <span className="font-medium text-[var(--color-text)]">
                ({fmt(avg3Month, currency)}/mes)
              </span>
              {", alcanzarías "}
              <span className="font-medium text-[var(--color-text)]">{fmt(goalNum, currency)}</span>
              {" en "}
              <span className="font-semibold text-[var(--color-accent)]">{monthsToReach} {monthsToReach === 1 ? "mes" : "meses"}</span>.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
