import { createClient } from "@/lib/supabase/server";
import { getOrCreateAccount } from "@/lib/account";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, toNum } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import type { ChannelType, InventoryMovementType, ExpenseCategory } from "@/generated/prisma/client";
import { calcMomPercent, calcOutstanding, calcStockInHand, STOCK_SIGN } from "@/lib/finance";
import DashboardSaleButton from "@/components/dashboard/DashboardSaleButton";
import DashboardExpenseButton from "@/components/dashboard/DashboardExpenseButton";

const LOW_STOCK_THRESHOLD = 10;

const CATEGORY_EMOJI: Record<string, string> = {
  SHIPPING: "📦", EVENTS: "🎪", SOCIAL_ADS: "📢", DESIGN_ART: "🎨",
  PRINT: "📖", EDITING: "✂️", MERCHANDISE_PRODUCTION: "🛍️",
  PLATFORMS_SOFTWARE: "💻", MARKETING_OTHER: "🏷️", OTHER: "💬",
};
const CATEGORY_LABEL: Record<string, string> = {
  SHIPPING: "Envíos", EVENTS: "Ferias", SOCIAL_ADS: "Publicidad", DESIGN_ART: "Diseño",
  PRINT: "Impresión", EDITING: "Edición", MERCHANDISE_PRODUCTION: "Prod. merch",
  PLATFORMS_SOFTWARE: "Plataformas", MARKETING_OTHER: "Marketing", OTHER: "Otros",
};

// ── Small stat ────────────────────────────────────────────────────────────────

function Stat({ label, value, sub, trend }: { label: string; value: string; sub?: string; trend?: number }) {
  const up   = trend !== undefined && trend > 0;
  const down = trend !== undefined && trend < 0;
  return (
    <div>
      <p className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-xl font-semibold text-[var(--color-text)] leading-none" style={{ fontFamily: "var(--font-heading)" }}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{sub}</p>}
      {trend !== undefined && (
        <p className={`text-[10px] font-medium mt-0.5 ${up ? "text-[var(--color-success)]" : down ? "text-[var(--color-danger)]" : "text-[var(--color-text-muted)]"}`}>
          {up ? "↑" : down ? "↓" : "→"} {Math.abs(trend).toFixed(0)}% vs. mes ant.
        </p>
      )}
    </div>
  );
}

// ── Horizontal bar ────────────────────────────────────────────────────────────

function Bar({ label, value, pct, currency }: { label: string; value: number; pct: number; currency: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-[var(--color-text)] truncate">{label}</span>
        <span className="text-xs font-medium text-[var(--color-text)] shrink-0">{formatCurrency(value, currency)}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-[var(--color-border)]">
          <div className="h-1.5 rounded-full bg-[var(--color-accent)]" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[10px] text-[var(--color-text-muted)] w-7 text-right">{pct.toFixed(0)}%</span>
      </div>
    </div>
  );
}

function ExpenseBar({ label, value, pct, currency }: { label: string; value: number; pct: number; currency: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-[var(--color-text)] truncate">{label}</span>
        <span className="text-xs font-medium text-[var(--color-text)] shrink-0">{formatCurrency(value, currency)}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-[var(--color-border)]">
          <div className="h-1.5 rounded-full bg-[var(--color-warning)]" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[10px] text-[var(--color-text-muted)] w-7 text-right">{pct.toFixed(0)}%</span>
      </div>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, action, children }: { title: string; action: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
        <h2 className="text-base font-semibold text-[var(--color-text)]" style={{ fontFamily: "var(--font-heading)" }}>
          {title}
        </h2>
        {action}
      </div>
      <CardContent className="p-5 space-y-5">
        {children}
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

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

  const now             = new Date();
  const monthStart      = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd    = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const yearStart       = new Date(now.getFullYear(), 0, 1);
  const currentMonth    = now.toLocaleString("es-CL", { month: "long", year: "numeric" });
  const firstName       = profile?.displayName?.split(" ")[0] ?? user.email?.split("@")[0] ?? "escritora";

  const channels = await prisma.channel.findMany({
    where:   { accountId: account.id },
    select:  { id: true, name: true, type: true, currency: true },
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

  const [
    monthlySales,
    prevMonthlySales,
    yearlySales,
    monthlyByChannel,
    payableSalesAgg,
    paymentsAgg,
    recentSales,
    books,
    printBooks,
    allMovements,
    monthlyExpenses,
    yearlyExpensesAgg,
    prevMonthExpensesAgg,
  ] = await Promise.all([
    prisma.sale.aggregate({
      where: { ...baseFilter, saleDate: { gte: monthStart } },
      _sum:  { amountCLP: true, quantity: true },
    }),
    prisma.sale.aggregate({
      where: { ...baseFilter, saleDate: { gte: prevMonthStart, lte: prevMonthEnd } },
      _sum:  { amountCLP: true },
    }),
    prisma.sale.aggregate({
      where: { ...baseFilter, saleDate: { gte: yearStart } },
      _sum:  { amountCLP: true },
    }),
    prisma.sale.groupBy({
      by:    ["channelId"],
      where: { ...baseFilter, saleDate: { gte: monthStart } },
      _sum:  { amountCLP: true, quantity: true },
    }),
    payableIds.length
      ? prisma.sale.groupBy({
          by:    ["channelId"],
          where: { channelId: { in: payableIds }, status: { not: "CANCELLED" } },
          _sum:  { amountCLP: true },
        })
      : Promise.resolve([] as { channelId: string; _sum: { amountCLP: unknown } }[]),
    payableIds.length
      ? prisma.payment.groupBy({
          by:    ["channelId"],
          where: { channelId: { in: payableIds } },
          _sum:  { amount: true },
        })
      : Promise.resolve([] as { channelId: string; _sum: { amount: unknown } }[]),
    prisma.sale.findMany({
      where:   { ...baseFilter, saleDate: { gte: monthStart } },
      select:  {
        id: true, quantity: true, unitPrice: true, totalAmount: true,
        amountCLP: true, currency: true, saleDate: true, paymentMethod: true,
        book:        { select: { title: true } },
        merchandise: { select: { name: true } },
        channel:     { select: { name: true, type: true } },
        bookId: true, channelId: true,
      },
      orderBy: { saleDate: "desc" },
      take:    5,
    }),
    prisma.book.findMany({
      where:   { accountId: account.id },
      select:  { id: true, title: true, coverUrl: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.book.findMany({
      where:  { accountId: account.id, formats: { has: "PRINT" } },
      select: { id: true, title: true },
    }),
    prisma.inventoryMovement.findMany({
      where:  { bookId: { not: null }, book: { accountId: account.id }, type: { in: Object.keys(STOCK_SIGN) as InventoryMovementType[] } },
      select: { bookId: true, type: true, quantity: true },
    }),
    prisma.expense.findMany({
      where:   { accountId: account.id, occurredAt: { gte: monthStart } },
      select:  { id: true, description: true, amount: true, currency: true, category: true, occurredAt: true },
      orderBy: { occurredAt: "desc" },
    }),
    prisma.expense.aggregate({
      where: { accountId: account.id, occurredAt: { gte: yearStart } },
      _sum:  { amount: true },
    }),
    prisma.expense.aggregate({
      where: { accountId: account.id, occurredAt: { gte: prevMonthStart, lte: prevMonthEnd } },
      _sum:  { amount: true },
    }),
  ]);

  // ── Sales computed ────────────────────────────────────────────────────────────

  const monthlyTotal  = toNum(monthlySales._sum.amountCLP);
  const prevTotal     = toNum(prevMonthlySales._sum.amountCLP);
  const yearlyTotal   = toNum(yearlySales._sum.amountCLP);
  const monthlyUnits  = monthlySales._sum.quantity ?? 0;
  const salesMomPct   = calcMomPercent(monthlyTotal, prevTotal);

  const salesByChannel    = new Map(payableSalesAgg.map(r => [r.channelId, toNum(r._sum.amountCLP)]));
  const paymentsByChannel = new Map(paymentsAgg.map(r => [r.channelId, toNum(r._sum.amount)]));

  const channelMap = new Map(channels.map(c => [c.id, c]));
  const breakdown  = monthlyByChannel
    .map(row => ({ channel: channelMap.get(row.channelId)!, revenue: toNum(row._sum.amountCLP), units: row._sum.quantity ?? 0 }))
    .filter(r => r.channel)
    .sort((a, b) => b.revenue - a.revenue);

  // ── Expenses computed ─────────────────────────────────────────────────────────

  const monthlyExpensesTotal = monthlyExpenses.reduce((s, e) => s + toNum(e.amount), 0);
  const yearlyExpensesTotal  = toNum(yearlyExpensesAgg._sum.amount);
  const prevMonthExpenses    = toNum(prevMonthExpensesAgg._sum.amount);
  const expensesMomPct       = calcMomPercent(monthlyExpensesTotal, prevMonthExpenses);

  const expensesByCat = new Map<ExpenseCategory, number>();
  for (const e of monthlyExpenses) {
    expensesByCat.set(e.category, (expensesByCat.get(e.category) ?? 0) + toNum(e.amount));
  }
  const categoryBreakdown = [...expensesByCat.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  // ── Net result ────────────────────────────────────────────────────────────────

  const netResult    = monthlyTotal - monthlyExpensesTotal;
  const prevNet      = prevTotal - prevMonthExpenses;
  const netMomPct    = calcMomPercent(netResult, prevNet);
  const netPositive  = netResult >= 0;

  // ── Alerts ────────────────────────────────────────────────────────────────────

  const alerts: { icon: string; text: string; href: string }[] = [];

  for (const ch of payableChannels) {
    const outstanding = calcOutstanding(salesByChannel.get(ch.id) ?? 0, paymentsByChannel.get(ch.id) ?? 0);
    if (outstanding > 0) {
      alerts.push({
        icon: "💰",
        text: `${ch.name} te debe ${formatCurrency(outstanding, currency)}`,
        href: "/finanzas?tab=deben",
      });
    }
  }

  const stockByBook = new Map<string, number>();
  for (const { bookId, type, quantity } of allMovements) {
    if (!bookId) continue;
    stockByBook.set(bookId, (stockByBook.get(bookId) ?? 0) + (STOCK_SIGN[type] ?? 0) * quantity);
  }
  for (const book of printBooks) {
    const stock = stockByBook.get(book.id) ?? 0;
    if (stock > 0 && stock <= LOW_STOCK_THRESHOLD) {
      alerts.push({ icon: "📦", text: `Stock bajo — "${book.title}" (${stock} ej.)`, href: "/libros" });
    }
  }

  // ── lastPrices for sale button ────────────────────────────────────────────────

  const lastPrices: Record<string, number> = {};
  for (const s of recentSales) {
    if (!s.bookId) continue;
    const key = `${s.bookId}_${s.channelId}`;
    if (!(key in lastPrices)) lastPrices[key] = toNum(s.unitPrice);
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <main className="p-5 md:p-8 max-w-5xl space-y-6">

      {/* Header */}
      <header>
        <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-widest mb-1 capitalize">
          {currentMonth}
        </p>
        <div className="flex items-end justify-between gap-4">
          <h1 className="text-4xl font-semibold text-[var(--color-text)] leading-none" style={{ fontFamily: "var(--font-heading)" }}>
            Hola, {firstName}
          </h1>
          <div className="text-right pb-0.5">
            <p className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Resultado neto del mes</p>
            <p className={`text-2xl font-semibold leading-none ${netPositive ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}
              style={{ fontFamily: "var(--font-heading)" }}>
              {netPositive ? "+" : ""}{formatCurrency(netResult, currency)}
            </p>
            {prevNet !== 0 && (
              <p className={`text-[10px] font-medium mt-0.5 ${netMomPct > 0 ? "text-[var(--color-success)]" : netMomPct < 0 ? "text-[var(--color-danger)]" : "text-[var(--color-text-muted)]"}`}>
                {netMomPct > 0 ? "↑" : netMomPct < 0 ? "↓" : "→"} {Math.abs(netMomPct).toFixed(0)}% vs. mes anterior
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Two sections */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* ── MIS VENTAS ────────────────────────────────────────────────────── */}
        <Section
          title="📚 Mis Ventas"
          action={
            <DashboardSaleButton
              accountCurrency={currency}
              books={books}
              channels={channels}
              lastPrices={lastPrices}
            />
          }
        >
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pb-1">
            <Stat label="Este mes"  value={formatCurrency(monthlyTotal, currency)} trend={salesMomPct} />
            <Stat label="Este año"  value={formatCurrency(yearlyTotal, currency)} />
            <Stat label="Unidades"  value={String(monthlyUnits)} sub="este mes" />
          </div>

          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="space-y-1.5">
              {alerts.map((alert, i) => (
                <a key={i} href={alert.href}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30 hover:bg-[var(--color-warning)]/15 transition-colors">
                  <span className="text-sm shrink-0">{alert.icon}</span>
                  <span className="text-xs text-[var(--color-text)] flex-1 leading-snug">{alert.text}</span>
                  <ChevronRight size={13} className="text-[var(--color-text-muted)] shrink-0" />
                </a>
              ))}
            </div>
          )}

          {/* Channel breakdown */}
          {breakdown.length > 0 ? (
            <div className="space-y-3">
              <p className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Por canal — este mes</p>
              <div className="space-y-2.5">
                {breakdown.map(({ channel, revenue }) => (
                  <Bar key={channel.id} label={channel.name}
                    value={revenue}
                    pct={monthlyTotal > 0 ? (revenue / monthlyTotal) * 100 : 0}
                    currency={currency} />
                ))}
              </div>
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-sm text-[var(--color-text-muted)]">Sin ventas este mes</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                {channels.length === 0 ? "Configura un canal primero" : "Usa el botón + para registrar una venta"}
              </p>
            </div>
          )}

          {/* Recent sales */}
          {recentSales.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-2">Últimas ventas</p>
              <div className="divide-y divide-[var(--color-border)] -mx-5">
                {recentSales.map(sale => {
                  const itemName = sale.book?.title ?? sale.merchandise?.name ?? "Venta";
                  const saleAmt  = toNum(sale.amountCLP) || toNum(sale.totalAmount);
                  return (
                    <div key={sale.id} className="flex items-center gap-3 px-5 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--color-text)] truncate">{itemName}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">
                          {formatDate(sale.saleDate)} · {sale.channel.name}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-[var(--color-text)]">
                          {formatCurrency(saleAmt, currency)}
                        </p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">{sale.quantity} ej.</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <a href="/finanzas?tab=ingresos"
                className="flex items-center justify-end gap-1 pt-2 text-xs font-medium text-[var(--color-accent)] hover:underline">
                Ver todas las ventas <ChevronRight size={12} />
              </a>
            </div>
          )}
        </Section>

        {/* ── MIS GASTOS ───────────────────────────────────────────────────── */}
        <Section
          title="💸 Mis Gastos"
          action={
            <DashboardExpenseButton
              accountId={account.id}
              currency={currency}
              books={books}
            />
          }
        >
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 pb-1">
            <Stat label="Este mes"  value={formatCurrency(monthlyExpensesTotal, currency)} trend={expensesMomPct !== 0 ? -expensesMomPct : undefined} />
            <Stat label="Este año"  value={formatCurrency(yearlyExpensesTotal, currency)} />
          </div>

          {/* Category breakdown */}
          {categoryBreakdown.length > 0 ? (
            <div className="space-y-3">
              <p className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Por categoría — este mes</p>
              <div className="space-y-2.5">
                {categoryBreakdown.map(([cat, amt]) => (
                  <ExpenseBar
                    key={cat}
                    label={`${CATEGORY_EMOJI[cat] ?? "💬"} ${CATEGORY_LABEL[cat] ?? cat}`}
                    value={amt}
                    pct={monthlyExpensesTotal > 0 ? (amt / monthlyExpensesTotal) * 100 : 0}
                    currency={currency}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-sm text-[var(--color-text-muted)]">Sin gastos este mes</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">Usa el botón + para registrar un gasto</p>
            </div>
          )}

          {/* Recent expenses */}
          {monthlyExpenses.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-2">Últimos gastos</p>
              <div className="divide-y divide-[var(--color-border)] -mx-5">
                {monthlyExpenses.slice(0, 5).map(exp => (
                  <div key={exp.id} className="flex items-center gap-3 px-5 py-2.5">
                    <span className="text-base shrink-0">{CATEGORY_EMOJI[exp.category] ?? "💬"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--color-text)] truncate">{exp.description}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)]">
                        {formatDate(exp.occurredAt)} · {CATEGORY_LABEL[exp.category] ?? exp.category}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-[var(--color-danger)] shrink-0">
                      −{formatCurrency(toNum(exp.amount), exp.currency)}
                    </p>
                  </div>
                ))}
              </div>
              <a href="/finanzas?tab=gastos"
                className="flex items-center justify-end gap-1 pt-2 text-xs font-medium text-[var(--color-accent)] hover:underline">
                Ver todos los gastos <ChevronRight size={12} />
              </a>
            </div>
          )}
        </Section>
      </div>
    </main>
  );
}
