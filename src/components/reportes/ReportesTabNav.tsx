"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

// Labels make explicit that these are analyses, distinct from the
// management pages Finanzas (transactions) and Inventario (stock ops).
const TABS = [
  { id: "ventas",        label: "Análisis de ventas"   },
  { id: "inventario",    label: "Estado de inventario" },
  { id: "cuadre",        label: "Cuadre"               },
  { id: "finanzas",      label: "Resumen financiero"   },
  { id: "proyecciones",  label: "Proyecciones"         },
];

export default function ReportesTabNav() {
  const params = useSearchParams();
  const active = params.get("tab") ?? "ventas";

  return (
    <div className="flex gap-1 border-b border-[var(--color-border)] mb-7 overflow-x-auto">
      {TABS.map(({ id, label }) => (
        <Link
          key={id}
          href={`/reportes?tab=${id}`}
          aria-current={active === id ? "page" : undefined}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
            active === id
              ? "border-[var(--color-accent)] text-[var(--color-accent)]"
              : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          )}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
