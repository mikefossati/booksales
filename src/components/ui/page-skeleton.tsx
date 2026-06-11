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
 * variant "default" mirrors title + stat cards + content cards;
 * variant "grid" mirrors title + tab bar + a cover-card grid (libros).
 */
export default function PageSkeleton({
  cards = 3,
  variant = "default",
}: {
  cards?: number;
  variant?: "default" | "grid";
}) {
  if (variant === "grid") {
    return (
      <main className="p-5 md:p-8 max-w-6xl space-y-6" aria-busy="true" aria-label="Cargando…">
        <Shimmer className="h-9 w-48" />
        <Shimmer className="h-10 w-72" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Shimmer key={i} className="aspect-[3/4]" />
          ))}
        </div>
      </main>
    );
  }

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
