"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "libros",          label: "Libros"         },
  { id: "merchandising",   label: "Merchandising"  },
  { id: "canjes",          label: "Canjes / Regalos" },
];

export default function LibrosTabNav() {
  const params = useSearchParams();
  const active = params.get("tab") ?? "libros";

  return (
    <div className="flex gap-1 border-b border-[var(--color-border)] mb-7 overflow-x-auto">
      {TABS.map(({ id, label }) => (
        <Link
          key={id}
          href={`/libros${id === "libros" ? "" : `?tab=${id}`}`}
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
