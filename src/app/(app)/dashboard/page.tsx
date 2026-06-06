import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateAccount } from "@/lib/account";
import { prisma } from "@/lib/prisma";
import { formatCurrency, toNum } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, TrendingUp, Clock, Package, BookOpen, ChevronRight } from "lucide-react";
import SalesChart from "@/components/dashboard/SalesChart";
import type { ChannelType, InventoryMovementType } from "@/generated/prisma/client";
import type { ChartRow } from "@/components/dashboard/SalesChart";
import {
  calcMomPercent,
  calcOutstanding,
  calcStockInHand,
  STOCK_SIGN,
} from "@/lib/finance";

const LOW_STOCK_THRESHOLD = 10;

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  highlight = false,
}: {
  title: string;
  value: string;
  subtitle?: string;
  trend?: number; // % change, positive = up
  icon: React.ElementType;
  highlight?: boolean;
}) {
  const trendUp    = trend !== undefined && trend > 0;
  const trendDown  = trend !== undefined && trend < 0;
  const trendLabel = trend !== undefined
    ? `${trendUp ? "↑" : trend < 0 ? "↓" : "→"} ${Math.abs(trend).toFixed(0)}% vs. mes anterior`
    : undefined;

  return (
    <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
      <CardHeader className="flex flex-row items-start justify-between pb-2 space-y-0">
        <CardTitle className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
          {title}
        </CardTitle>
        <div className={`p-1.5 rounded-[var(--radius-sm)] ${highlight ? "bg-[var(--color-secondary)] text-white" : "bg-[var(--color-accent-light)] text-[var(--color-accent)]"}`}>
          <Icon size={14} />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-2xl font-semibold text-[var(--color-text)] leading-none" style={{ fontFamily: "var(--font-heading)" }}>
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-[var(--color-text-muted)] mt-1.5">{subtitle}</p>
        )}
        {trendLabel && (
          <p className={`text-xs mt-1 font-medium ${trendUp ? "text-[var(--color-success)]" : trendDown ? "text-[var(--color-danger)]" : "text-[var(--color-text-muted)]"}`}>
            {trendLabel}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const account  = await getOrCreateAccount(user.id, user.email ?? "");
  const currency = account.baseCurrency;

  const profile = await prisma.profile.findUnique({
    where:  { supabaseId: user.id },
    select: { displayName: true },
  });

  const now            = new Date();
  const monthStart     = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const yearStart      = new Date(now.getFullYear(), 0, 1);
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const currentMonth   = now.toLocaleString("es-CL", { month: "long", year: "numeric" });
  const firstName      = profile?.displayName?.split(" ")[0] ?? user.email?.split("@")[0] ?? "escritora";

  // ── Channels ────────────────────────────────────────────────────────────────

  const channels = await prisma.channel.findMany({
    where: { accountId: account.id },
    select: { id: true, name: true, type: true },
    orderBy: { createdAt: "asc" },
  });
  const channelIds     = channels.map(c => c.id);
  const channelTypeMap = new Map(channels.map(c => [c.id, c.type as ChannelType]));

  const baseFilter = {
    channelId: { in: channelIds.length ? channelIds : ["__none__"] },
    status: { not: "CANCELLED" as const },
  };

  const payableChannels = channels.filter(c => c.type === "BOOKSTORE" || c.type === "DIGITAL");
  const payableIds      = payableChannels.map(c => c.id);

  // ── Data ────────────────────────────────────────────────────────────────────

  const [
    monthlySales,
    prevMonthlySales,
    yearlySales,
    monthlyByChannel,
    payableSalesAgg,
    paymentsAgg,
    chartSalesRaw,
    printBooks,
    allMovements,
  ] = await Promise.all([
    prisma.sale.aggregate({
      where: { ...baseFilter, saleDate: { gte: monthStart } },
      _sum: { amountCLP: true, quantity: true },
    }),
    prisma.sale.aggregate({
      where: { ...baseFilter, saleDate: { gte: prevMonthStart, lte: prevMonthEnd } },
      _sum: { amountCLP: true },
    }),
    prisma.sale.aggregate({
      where: { ...baseFilter, saleDate: { gte: yearStart } },
      _sum: { amountCLP: true },
    }),
    prisma.sale.groupBy({
      by: ["channelId"],
      where: { ...baseFilter, saleDate: { gte: monthStart } },
      _sum: { amountCLP: true, quantity: true },
    }),
    payableIds.length
      ? prisma.sale.groupBy({
          by: ["channelId"],
          where: { channelId: { in: payableIds }, status: { not: "CANCELLED" } },
          _sum: { amountCLP: true },
        })
      : Promise.resolve([] as { channelId: string; _sum: { amountCLP: unknown } }[]),
    payableIds.length
      ? prisma.payment.groupBy({
          by: ["channelId"],
          where: { channelId: { in: payableIds } },
          _sum: { amount: true },
        })
      : Promise.resolve([] as { channelId: string; _sum: { amount: unknown } }[]),
    prisma.sale.findMany({
      where: { ...baseFilter, saleDate: { gte: twelveMonthsAgo } },
      select: { channelId: true, totalAmount: true, amountCLP: true, currency: true, saleDate: true },
    }),
    prisma.book.findMany({
      where: { accountId: account.id, formats: { has: "PRINT" } },
      select: { id: true, title: true },
    }),
    prisma.inventoryMovement.findMany({
      where: {
        bookId: { not: null },
        book:   { accountId: account.id },
        type:   { in: Object.keys(STOCK_SIGN) as InventoryMovementType[] },
      },
      select: { bookId: true, type: true, quantity: true },
    }),
  ]);

  // ── Computed values ──────────────────────────────────────────────────────────

  const monthlyTotal   = toNum(monthlySales._sum.amountCLP);
  const prevTotal      = toNum(prevMonthlySales._sum.amountCLP);
  const yearlyTotal    = toNum(yearlySales._sum.amountCLP);
  const monthlyUnits   = monthlySales._sum.quantity ?? 0;

  const momPct = calcMomPercent(monthlyTotal, prevTotal);

  // Actual outstanding = sales − payments
  const salesByChannel    = new Map(payableSalesAgg.map(r => [r.channelId, toNum(r._sum.amountCLP)]));
  const paymentsByChannel = new Map(paymentsAgg.map(r => [r.channelId, toNum(r._sum.amount)]));
  const pendingTotal = payableIds.reduce((sum, id) => {
    return sum + calcOutstanding(salesByChannel.get(id) ?? 0, paymentsByChannel.get(id) ?? 0);
  }, 0);

  // Channel breakdown for current month
  const channelMap = new Map(channels.map(c => [c.id, c]));
  const breakdown  = monthlyByChannel
    .map(row => ({
      channel: channelMap.get(row.channelId)!,
      revenue: toNum(row._sum.amountCLP),
      units:   row._sum.quantity ?? 0,
    }))
    .filter(r => r.channel)
    .sort((a, b) => b.revenue - a.revenue);

  // 12-month chart data
  const months: Array<{ label: string; start: Date; end: Date }> = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleString("es-CL", { month: "short" }).replace(".", ""),
      start: d,
      end:   new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59),
    });
  }

  const chartData: ChartRow[] = months.map(({ label, start, end }) => {
    const bucket = chartSalesRaw.filter(s => {
      const d = new Date(s.saleDate);
      return d >= start && d <= end;
    });
    const sumByType = (type: ChannelType) =>
      Math.round(bucket
        .filter(s => {
          const t = channelTypeMap.get(s.channelId);
          return type === "DIRECT" ? (t === "DIRECT" || t === "PRESALE") : t === type;
        })
        .reduce((sum, s) => sum + (toNum(s.amountCLP) || toNum(s.totalAmount)), 0));
    return { month: label, Digital: sumByType("DIGITAL"), Librerías: sumByType("BOOKSTORE"), Directo: sumByType("DIRECT") };
  });

  // Pending tasks
  type Task = { icon: string; text: string; href: string; cta: string };
  const tasks: Task[] = [];

  // Outstanding payments per payable channel
  for (const ch of payableChannels) {
    const outstanding = Math.max(0, (salesByChannel.get(ch.id) ?? 0) - (paymentsByChannel.get(ch.id) ?? 0));
    if (outstanding > 0) {
      tasks.push({
        icon: "💰",
        text: `${ch.name} te debe ${formatCurrency(outstanding, currency)}`,
        href: "/finanzas?tab=deben",
        cta:  "Ver detalle",
      });
    }
  }

  // Low stock books
  const stockByBook = new Map<string, number>();
  for (const { bookId, type, quantity } of allMovements) {
    if (!bookId) continue;
    stockByBook.set(bookId, (stockByBook.get(bookId) ?? 0) + (STOCK_SIGN[type] ?? 0) * quantity);
  }
  for (const book of printBooks) {
    const stock = stockByBook.get(book.id) ?? 0;
    if (stock > 0 && stock <= LOW_STOCK_THRESHOLD) {
      tasks.push({
        icon: "📦",
        text: `Stock bajo en "${book.title}" — quedan ${stock} ej.`,
        href: "/libros",
        cta:  "Ver libros",
      });
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <main className="p-5 md:p-8 max-w-6xl">
      <header className="mb-8">
        <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-widest mb-1 capitalize">
          {currentMonth}
        </p>
        <h1
          className="text-4xl font-semibold text-[var(--color-text)] leading-none"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Hola, {firstName}
        </h1>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 mb-7">
        <StatCard
          title="Este mes"
          value={formatCurrency(monthlyTotal, currency)}
          subtitle={monthlyUnits > 0 ? `${monthlyUnits} unidades` : "Sin ventas aún"}
          trend={momPct}
          icon={Calendar}
        />
        <StatCard
          title="Este año"
          value={formatCurrency(yearlyTotal, currency)}
          subtitle={`Acumulado ${now.getFullYear()}`}
          icon={TrendingUp}
        />
        <StatCard
          title="¿Qué me deben?"
          value={formatCurrency(pendingTotal, currency)}
          subtitle={pendingTotal > 0 ? "Librerías y plataformas digitales" : "Sin cobros pendientes"}
          icon={Clock}
          highlight
        />
        <StatCard
          title="Unidades vendidas"
          value={String(monthlyUnits)}
          subtitle="Este mes"
          icon={Package}
        />
      </div>

      {/* Sales chart — 12 months */}
      <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)] mb-5">
        <CardHeader className="pb-2">
          <CardTitle
            className="text-sm font-semibold text-[var(--color-text)]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Ventas — últimos 12 meses
          </CardTitle>
        </CardHeader>
        <CardContent className="pr-4">
          <Suspense fallback={<div className="h-[220px]" />}>
            <SalesChart data={chartData} />
          </Suspense>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Pending tasks */}
        <div className="lg:col-span-1 space-y-3">
          <h2
            className="text-sm font-semibold text-[var(--color-text)]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Tareas pendientes
          </h2>
          <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
            <CardContent className="p-0">
              {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center gap-2 px-5">
                  <div className="w-9 h-9 rounded-full bg-[var(--color-accent-light)] flex items-center justify-center text-[var(--color-accent)] text-base">
                    ✓
                  </div>
                  <p className="text-sm font-medium text-[var(--color-text)]">Todo al día</p>
                  <p className="text-xs text-[var(--color-text-muted)]">No hay tareas pendientes</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--color-border)]">
                  {tasks.map((task, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                      <span className="text-base shrink-0">{task.icon}</span>
                      <p className="text-xs text-[var(--color-text)] flex-1 leading-snug">{task.text}</p>
                      <a
                        href={task.href}
                        className="text-xs font-medium text-[var(--color-accent)] hover:underline shrink-0"
                      >
                        {task.cta}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Channel breakdown */}
        <div className="lg:col-span-2 space-y-3">
          <h2
            className="text-sm font-semibold text-[var(--color-text)]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Ventas por canal — este mes
          </h2>
          <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
            {breakdown.length === 0 ? (
              <CardContent className="p-5">
                <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[var(--color-accent-light)] flex items-center justify-center text-[var(--color-accent)]">
                    <BookOpen size={22} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">Sin ventas este mes</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      {channels.length === 0
                        ? "Configura un canal para empezar"
                        : "Registra tu primera venta con el botón +"}
                    </p>
                  </div>
                  {channels.length === 0 && (
                    <a
                      href="/configuracion"
                      className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-accent)] hover:underline"
                    >
                      Configurar canales <ChevronRight size={13} />
                    </a>
                  )}
                </div>
              </CardContent>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-2.5">
                  <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Canal</span>
                  <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide text-right">Unid.</span>
                  <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide text-right w-28">Ingresos</span>
                </div>
                {breakdown.map(({ channel, revenue, units }) => {
                  const pct = monthlyTotal > 0 ? (revenue / monthlyTotal) * 100 : 0;
                  return (
                    <div key={channel.id} className="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-3.5 items-center">
                      <div>
                        <p className="text-sm font-medium text-[var(--color-text)]">{channel.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1 rounded-full bg-[var(--color-border)] max-w-[120px]">
                            <div className="h-1 rounded-full bg-[var(--color-accent)]" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-[var(--color-text-muted)]">{pct.toFixed(0)}%</span>
                        </div>
                      </div>
                      <span className="text-sm text-[var(--color-text)] text-right">{units}</span>
                      <span className="text-sm font-semibold text-[var(--color-text)] text-right w-28">
                        {formatCurrency(revenue, currency)}
                      </span>
                    </div>
                  );
                })}
                <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-3 bg-[var(--color-accent-light)]/40">
                  <span className="text-xs font-semibold text-[var(--color-text)]">Total</span>
                  <span className="text-xs font-semibold text-[var(--color-text)] text-right">{monthlyUnits}</span>
                  <span className="text-sm font-semibold text-[var(--color-accent)] text-right w-28">
                    {formatCurrency(monthlyTotal, currency)}
                  </span>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}
