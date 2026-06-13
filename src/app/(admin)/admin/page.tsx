import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { Users, CreditCard, TrendingUp, CalendarDays } from "lucide-react";

export default async function AdminDashboardPage() {
  await requireAdmin();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [total, proCount, freeCount, recentCount, recentAccounts] = await Promise.all([
    prisma.account.count(),
    prisma.account.count({ where: { plan: "PRO" } }),
    prisma.account.count({ where: { plan: "FREE" } }),
    prisma.account.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.account.findMany({
      where:   { createdAt: { gte: sevenDaysAgo } },
      include: { owner: { select: { email: true, displayName: true } } },
      orderBy: { createdAt: "desc" },
      take:    10,
    }),
  ]);

  const stats = [
    { label: "Cuentas totales",     value: total,       icon: Users,        color: "text-[var(--color-accent)]",   bg: "bg-[var(--color-accent-light)]"    },
    { label: "Plan Pro",            value: proCount,    icon: CreditCard,   color: "text-[var(--color-success)]",  bg: "bg-[var(--color-accent-light)]"    },
    { label: "Plan Free",           value: freeCount,   icon: TrendingUp,   color: "text-[var(--color-warning-text)]", bg: "bg-[var(--color-secondary-light)]" },
    { label: "Nuevas (30 días)",    value: recentCount, icon: CalendarDays, color: "text-[var(--color-text-muted)]", bg: "bg-[var(--color-border)]/50"     },
  ];

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[var(--color-text)] font-heading">Dashboard</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Resumen general de la plataforma</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] p-5 border border-[var(--color-border)] shadow-[var(--shadow-card)]"
          >
            <div className={`w-9 h-9 rounded-[var(--radius-md)] ${bg} flex items-center justify-center mb-3`}>
              <Icon size={17} className={color} />
            </div>
            <p className="text-2xl font-semibold text-[var(--color-text)]">{value}</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent signups */}
      <section>
        <h2 className="text-base font-semibold text-[var(--color-text)] mb-3">
          Nuevas cuentas — últimos 7 días
          <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">
            ({recentAccounts.length})
          </span>
        </h2>

        {recentAccounts.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] py-6 text-center border border-dashed border-[var(--color-border)] rounded-[var(--radius-lg)]">
            Sin registros nuevos en los últimos 7 días
          </p>
        ) : (
          <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
            {recentAccounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">
                    {account.owner.displayName ?? account.owner.email}
                  </p>
                  {account.owner.displayName && (
                    <p className="text-xs text-[var(--color-text-muted)]">{account.owner.email}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    account.plan === "PRO"
                      ? "bg-[var(--color-accent-light)] text-[var(--color-accent)]"
                      : "bg-[var(--color-secondary-light)] text-[var(--color-warning-text)]"
                  }`}>
                    {account.plan}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {account.createdAt.toLocaleDateString("es-CL")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
