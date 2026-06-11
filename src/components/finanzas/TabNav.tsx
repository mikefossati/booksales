"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  // id "ingresos" kept for existing deep links; label matches the
  // dashboard vocabulary ("Mis Ventas", "Ver todas las ventas")
  { id: "ingresos",      label: "Ventas"           },
  { id: "gastos",        label: "Gastos"            },
  { id: "deben",         label: "¿Qué me deben?"   },
  { id: "rentabilidad",  label: "Rentabilidad"      },
];

export default function TabNav() {
  const params = useSearchParams();
  const active = params.get("tab") ?? "ingresos";

  return (
    <div className="flex gap-1 border-b border-[var(--color-border)] mb-7 overflow-x-auto">
      {TABS.map(({ id, label }) => (
        <Link
          key={id}
          href={`/finanzas?tab=${id}`}
          aria-current={active === id ? "page" : undefined}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors duration-[var(--duration-fast)] whitespace-nowrap",
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
