"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const PERIODS = [
  { id: "mes",  label: "Este mes"  },
  { id: "año",  label: "Este año"  },
  { id: "todo", label: "Histórico" },
];

export default function PeriodNav() {
  const params  = useSearchParams();
  const active  = params.get("period") ?? "mes";

  return (
    <div className="flex gap-1.5 mb-6">
      {PERIODS.map(({ id, label }) => (
        <Link
          key={id}
          href={`/reportes?tab=ventas&period=${id}`}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
            active === id
              ? "bg-[var(--color-accent)] text-white"
              : "bg-[var(--color-accent-light)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white"
          )}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
