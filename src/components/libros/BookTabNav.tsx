"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export default function BookTabNav({
  bookId,
  isPrint,
}: {
  bookId: string;
  isPrint: boolean;
}) {
  const params = useSearchParams();
  const active = params.get("tab") ?? "resumen";

  const tabs = [
    { id: "resumen",    label: "Resumen"    },
    { id: "ventas",     label: "Ventas"     },
    ...(isPrint
      ? [
          { id: "tiradas",    label: "Tiradas"    },
          { id: "inventario", label: "Inventario" },
        ]
      : []),
  ];

  return (
    <div className="flex gap-1 border-b border-[var(--color-border)] mb-7">
      {tabs.map(({ id, label }) => (
        <Link
          key={id}
          href={`/libros/${bookId}?tab=${id}`}
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
