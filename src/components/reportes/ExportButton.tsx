"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText, ChevronDown } from "lucide-react";
import { useModalA11y } from "@/hooks/useModalA11y";

type Period = "mes" | "año" | "todo";

const PERIODS: { value: Period; label: string }[] = [
  { value: "mes",  label: "Mes actual" },
  { value: "año",  label: "Este año" },
  { value: "todo", label: "Todo (histórico)" },
];

// Tabs whose CSV export contains multiple sheets (served as one .zip)
const MULTI_SHEET_TABS = new Set(["inventario", "finanzas", "all"]);

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
  const panelRef = useModalA11y<HTMLDivElement>(open, () => setOpen(false));

  const showPeriod = tab === "ventas" || tab === "all";
  const isZip      = MULTI_SHEET_TABS.has(tab);

  function handleDownload(format: "xlsx" | "csv") {
    const p = showPeriod ? period : "todo";
    triggerDownload(`/api/export?tab=${tab}&period=${p}&format=${format}`);
    setOpen(false);
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size={size === "sm" ? "sm" : "default"}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="gap-1.5 border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
      >
        <Download className="h-3.5 w-3.5" />
        {size === "sm" ? "Exportar" : "Exportar datos"}
        <ChevronDown className="h-3 w-3 text-[var(--color-text-muted)]" />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            ref={panelRef}
            role="menu"
            aria-label="Opciones de exportación"
            className="absolute right-0 top-full mt-1.5 z-20 w-56 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg p-3 space-y-3"
          >
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
                role="menuitem"
                onClick={() => handleDownload("xlsx")}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-accent-light)] transition-colors"
              >
                <FileSpreadsheet className="h-4 w-4 text-green-600 shrink-0" />
                <span className="flex-1 text-left">Excel (.xlsx)</span>
              </button>
              <button
                role="menuitem"
                onClick={() => handleDownload("csv")}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-accent-light)] transition-colors"
              >
                <FileText className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" />
                <span className="flex-1 text-left">CSV{isZip ? " (.zip)" : ""}</span>
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
