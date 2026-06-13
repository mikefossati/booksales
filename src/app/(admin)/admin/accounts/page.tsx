import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { ChevronRight } from "lucide-react";

export default async function AdminAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; plan?: string }>;
}) {
  await requireAdmin();

  const { q = "", plan = "" } = await searchParams;

  const accounts = await prisma.account.findMany({
    where: {
      ...(plan === "PRO" || plan === "FREE" ? { plan: plan as "PRO" | "FREE" } : {}),
      ...(q.trim()
        ? {
            owner: {
              OR: [
                { email:       { contains: q, mode: "insensitive" } },
                { displayName: { contains: q, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    },
    include: {
      owner:  { select: { email: true, displayName: true } },
      _count: { select: { books: true, channels: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text)] font-heading">Cuentas</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            {accounts.length} cuenta{accounts.length !== 1 ? "s" : ""}
            {q || plan ? " (filtradas)" : ""}
          </p>
        </div>
      </div>

      {/* Filters */}
      <form method="GET" className="flex gap-3 mb-5">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por email o nombre…"
          className="flex-1 px-3 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
        />
        <select
          name="plan"
          defaultValue={plan}
          className="px-3 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
        >
          <option value="">Todos los planes</option>
          <option value="PRO">Pro</option>
          <option value="FREE">Free</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium bg-[var(--color-accent)] text-white rounded-[var(--radius-md)] hover:opacity-90 transition-opacity"
        >
          Filtrar
        </button>
        {(q || plan) && (
          <Link
            href="/admin/accounts"
            className="px-4 py-2 text-sm text-[var(--color-text-muted)] rounded-[var(--radius-md)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors"
          >
            Limpiar
          </Link>
        )}
      </form>

      {/* Table */}
      {accounts.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)] py-12 text-center border border-dashed border-[var(--color-border)] rounded-[var(--radius-lg)]">
          Sin resultados
        </p>
      ) : (
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] overflow-hidden shadow-[var(--shadow-card)]">
          {/* Header */}
          <div className="grid grid-cols-[1fr_90px_60px_60px_110px_36px] gap-4 px-5 py-2.5 bg-[var(--color-bg)] border-b border-[var(--color-border)]">
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Cuenta</span>
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Plan</span>
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide text-center">Libros</span>
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide text-center">Canales</span>
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Creada</span>
            <span />
          </div>

          {/* Rows */}
          {accounts.map((account) => (
            <Link
              key={account.id}
              href={`/admin/accounts/${account.id}`}
              className="grid grid-cols-[1fr_90px_60px_60px_110px_36px] gap-4 px-5 py-3.5 border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-accent-light)]/40 transition-colors items-center"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--color-text)] truncate">
                  {account.owner.displayName ?? account.owner.email}
                </p>
                {account.owner.displayName && (
                  <p className="text-xs text-[var(--color-text-muted)] truncate">{account.owner.email}</p>
                )}
              </div>

              <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit ${
                account.plan === "PRO"
                  ? "bg-[var(--color-accent-light)] text-[var(--color-accent)]"
                  : "bg-[var(--color-secondary-light)] text-[var(--color-warning-text)]"
              }`}>
                {account.plan}
              </span>

              <span className="text-sm text-[var(--color-text)] text-center">{account._count.books}</span>
              <span className="text-sm text-[var(--color-text)] text-center">{account._count.channels}</span>

              <span className="text-xs text-[var(--color-text-muted)]">
                {account.createdAt.toLocaleDateString("es-CL")}
              </span>

              <ChevronRight size={15} className="text-[var(--color-text-muted)] justify-self-end" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
