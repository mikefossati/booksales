import { cn } from "@/lib/utils";

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[var(--radius-md)] bg-[var(--color-border)]/60",
        className,
      )}
    />
  );
}

/**
 * Generic page skeleton shown while a server page is loading.
 * Mirrors the common layout: page title, stat cards, then content cards.
 */
export default function PageSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <main className="p-5 md:p-8 max-w-5xl space-y-6" aria-busy="true" aria-label="Cargando…">
      <Shimmer className="h-9 w-48" />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Shimmer key={i} className="h-20" />
        ))}
      </div>
      {Array.from({ length: cards }).map((_, i) => (
        <Shimmer key={i} className="h-48" />
      ))}
    </main>
  );
}
