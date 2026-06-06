"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText, ChevronDown } from "lucide-react";

type Period = "mes" | "año" | "todo";

const PERIODS: { value: Period; label: string }[] = [
  { value: "mes",  label: "Mes actual" },
  { value: "año",  label: "Este año" },
  { value: "todo", label: "Todo (histórico)" },
];

// Number of CSV sheets per tab
const CSV_SHEET_COUNT: Record<string, number> = {
  ventas:       1,
  inventario:   3,
  finanzas:     3,
  proyecciones: 1,
};

// For "all + CSV", download one file per major tab
const ALL_CSV_TABS = ["ventas", "inventario", "finanzas", "proyecciones"] as const;

function triggerDownload(url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function ExportButton({ tab, size = "default" }: { tab: string; size?: "default" | "sm" }) {
  const [open, setOpen]     = useState(false);
  const [period, setPeriod] = useState<Period>("mes");

  const showPeriod = tab === "ventas" || tab === "all";

  function buildUrl(t: string, fmt: string, sheet?: number) {
    const p = showPeriod ? period : "todo";
    const base = `/api/export?tab=${t}&period=${p}&format=${fmt}`;
    return sheet !== undefined ? `${base}&sheet=${sheet}` : base;
  }

  function handleXlsx() {
    triggerDownload(buildUrl(tab, "xlsx"));
    setOpen(false);
  }

  function handleCsv() {
    if (tab === "all") {
      ALL_CSV_TABS.forEach((t, i) => {
        setTimeout(() => triggerDownload(buildUrl(t, "csv")), i * 400);
      });
    } else {
      const count = CSV_SHEET_COUNT[tab] ?? 1;
      for (let i = 0; i < count; i++) {
        setTimeout(() => triggerDownload(buildUrl(tab, "csv", i)), i * 400);
      }
    }
    setOpen(false);
  }

  const csvFiles = tab === "all" ? ALL_CSV_TABS.length : (CSV_SHEET_COUNT[tab] ?? 1);

  return (
    <div className="relative">
      <Button
        variant="outline"
        size={size === "sm" ? "sm" : "default"}
        onClick={() => setOpen(o => !o)}
        className="gap-1.5 border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
      >
        <Download className="h-3.5 w-3.5" />
        {size === "sm" ? "Exportar" : "Exportar datos"}
        <ChevronDown className="h-3 w-3 text-[var(--color-text-muted)]" />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 z-20 w-56 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg p-3 space-y-3">

            {showPeriod && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">Período</p>
                <div className="space-y-1.5">
                  {PERIODS.map(p => (
                    <label key={p.value} className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name={`export-period-${tab}`}
                        value={p.value}
                        checked={period === p.value}
                        onChange={() => setPeriod(p.value)}
                        className="accent-[var(--color-accent)] h-3.5 w-3.5"
                      />
                      <span className="text-sm text-[var(--color-text)]">{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">Formato</p>
              <button
                onClick={handleXlsx}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-accent-light)] transition-colors"
              >
                <FileSpreadsheet className="h-4 w-4 text-green-600 shrink-0" />
                <span className="flex-1 text-left">Excel (.xlsx)</span>
              </button>
              <button
                onClick={handleCsv}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-accent-light)] transition-colors"
              >
                <FileText className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" />
                <span className="flex-1 text-left">CSV</span>
                {csvFiles > 1 && (
                  <span className="text-[10px] text-[var(--color-text-muted)] bg-[var(--color-border)] rounded px-1.5 py-0.5">
                    {csvFiles} archivos
                  </span>
                )}
              </button>
            </div>

            {!showPeriod && (
              <p className="text-[10px] text-[var(--color-text-muted)] pt-0.5">Incluye datos históricos completos</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
