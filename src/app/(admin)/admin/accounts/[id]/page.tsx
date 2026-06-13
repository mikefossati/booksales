import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import AccountPlanForm from "@/components/admin/AccountPlanForm";
import { ChevronLeft, BookOpen, Globe, ShoppingCart, Sparkles } from "lucide-react";
import { isProActive } from "@/lib/plan";

export default async function AdminAccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();

  const { id } = await params;

  const account = await prisma.account.findUnique({
    where:   { id },
    include: {
      owner:  { select: { email: true, displayName: true, createdAt: true } },
      _count: {
        select: {
          books:      true,
          channels:   true,
          expenses:   true,
        },
      },
    },
  });

  if (!account) notFound();

  const salesCount = await prisma.sale.count({
    where: { channel: { accountId: id } },
  });

  const pro    = isProActive(account);
  const status = pro
    ? account.planExpiresAt
      ? `Pro · vence ${account.planExpiresAt.toLocaleDateString("es-CL")}`
      : "Pro · lifetime"
    : "Free";

  const stats = [
    { label: "Libros",    value: account._count.books,    icon: BookOpen    },
    { label: "Canales",   value: account._count.channels, icon: Globe       },
    { label: "Ventas",    value: salesCount,              icon: ShoppingCart },
    { label: "Gastos",    value: account._count.expenses, icon: Sparkles    },
  ];

  return (
    <div className="p-8 max-w-3xl">
      {/* Breadcrumb */}
      <Link
        href="/admin/accounts"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] mb-6 transition-colors"
      >
        <ChevronLeft size={14} />
        Cuentas
      </Link>

      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text)] font-heading">
            {account.owner.displayName ?? account.owner.email}
          </h1>
          {account.owner.displayName && (
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{account.owner.email}</p>
          )}
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Cuenta creada el {account.createdAt.toLocaleDateString("es-CL")}
          </p>
        </div>
        <span className={`text-sm font-medium px-3 py-1 rounded-full ${
          pro
            ? "bg-[var(--color-accent-light)] text-[var(--color-accent)]"
            : "bg-[var(--color-secondary-light)] text-[var(--color-warning-text)]"
        }`}>
          {status}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {stats.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] p-4 border border-[var(--color-border)] text-center shadow-[var(--shadow-card)]"
          >
            <Icon size={16} className="mx-auto mb-1.5 text-[var(--color-text-muted)]" />
            <p className="text-xl font-semibold text-[var(--color-text)]">{value}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
          </div>
        ))}
      </div>

      {/* Plan editor */}
      <section className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-6 shadow-[var(--shadow-card)]">
        <h2 className="text-base font-semibold text-[var(--color-text)] mb-4">Gestión de plan</h2>
        <AccountPlanForm
          accountId={id}
          currentPlan={account.plan}
          planExpiresAt={account.planExpiresAt}
        />
      </section>
    </div>
  );
}
