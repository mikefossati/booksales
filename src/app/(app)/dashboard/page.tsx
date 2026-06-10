import { createClient } from "@/lib/supabase/server";
import { getOrCreateAccount } from "@/lib/account";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, toNum } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import type { ChannelType, ExpenseCategory } from "@/generated/prisma/client";
import { calcMomPercent, calcOutstanding, calcStockMatrix, saleToCLP } from "@/lib/finance";
import { getCachedReportesData } from "@/lib/data-cache";
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

  // Profile is not in the shared cache (user-specific, rarely changes)
  const profile = await prisma.profile.findUnique({
    where:  { supabaseId: user.id },
    select: { displayName: true },
  });

  // All other data comes from the shared cache (same dataset as reportes)
  const { channels, allSales, allExpenses, allPayments, books, bookMovements, inventories } =
    await getCachedReportesData(account.id);

  // ── Date boundaries ───────────────────────────────────────────────────────

  const now            = new Date();
  const monthStart     = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const yearStart      = new Date(now.getFullYear(), 0, 1);
  const currentMonth   = now.toLocaleString("es-CL", { month: "long", year: "numeric" });
  const firstName      = profile?.displayName?.split(" ")[0] ?? user.email?.split("@")[0] ?? "escritora";

  // ── Channel maps ──────────────────────────────────────────────────────────

  const channelMap      = new Map(channels.map(c => [c.id, c]));
  const payableChannels = channels.filter(c => c.type === "BOOKSTORE" || c.type === "DIGITAL");

  // ── Sales: in-memory period filtering and aggregation ─────────────────────

  const salesThisMonth = allSales.filter(s => new Date(s.saleDate) >= monthStart);
  const salesPrevMonth = allSales.filter(s => {
    const d = new Date(s.saleDate);
    return d >= prevMonthStart && d <= prevMonthEnd;
  });
  const salesThisYear = allSales.filter(s => new Date(s.saleDate) >= yearStart);

  const monthlyTotal = salesThisMonth.reduce((sum, s) => sum + saleToCLP(s), 0);
  const monthlyUnits = salesThisMonth.reduce((sum, s) => sum + s.quantity, 0);
  const prevTotal    = salesPrevMonth.reduce((sum, s) => sum + saleToCLP(s), 0);
  const yearlyTotal  = salesThisYear.reduce((sum, s) => sum + saleToCLP(s), 0);
  const salesMomPct  = calcMomPercent(monthlyTotal, prevTotal);

  // Channel breakdown this month
  const byChannelRevenue = new Map<string, { revenue: number; units: number }>();
  for (const s of salesThisMonth) {
    const cur = byChannelRevenue.get(s.channelId) ?? { revenue: 0, units: 0 };
    byChannelRevenue.set(s.channelId, { revenue: cur.revenue + saleToCLP(s), units: cur.units + s.quantity });
  }
  const breakdown = [...byChannelRevenue.entries()]
    .map(([id, d]) => ({ channel: channelMap.get(id)!, ...d }))
    .filter(r => r.channel)
    .sort((a, b) => b.revenue - a.revenue);

  // Outstanding per payable channel (all-time)
  const salesByChannel    = new Map<string, number>();
  const paymentsByChannel = new Map<string, number>();
  for (const s of allSales)    salesByChannel.set(s.channelId, (salesByChannel.get(s.channelId) ?? 0) + saleToCLP(s));
  for (const p of allPayments) paymentsByChannel.set(p.channelId, (paymentsByChannel.get(p.channelId) ?? 0) + toNum(p.amount));

  // Recent sales (last 5 this month, already sorted desc by saleDate from cache)
  const recentSales = salesThisMonth.slice(0, 5);

  // ── Books and stock ───────────────────────────────────────────────────────

  const bookMap    = new Map(books.map(b => [b.id, b]));
  const printBooks = books.filter(b => b.formats.includes("PRINT"));

  // Low-stock alert watches the personal (default) inventory
  const defaultInventoryId = inventories.find(i => i.isDefault)?.id;
  const stockMatrix = calcStockMatrix(bookMovements);
  const stockByBook = defaultInventoryId
    ? (stockMatrix.get(defaultInventoryId) ?? new Map<string, number>())
    : new Map<string, number>();

  // Last prices for sale button (most recent non-bulk sale per book+channel)
  const lastPrices: Record<string, number> = {};
  for (const s of allSales) {
    if (!s.bookId || s.isBulk) continue;
    const key = `${s.bookId}_${s.channelId}`;
    if (!(key in lastPrices)) lastPrices[key] = toNum(s.unitPrice);
  }

  // ── Expenses: in-memory period filtering ─────────────────────────────────

  const expensesThisMonth = allExpenses.filter(e => new Date(e.occurredAt) >= monthStart);
  const expensesPrevMonth = allExpenses.filter(e => {
    const d = new Date(e.occurredAt);
    return d >= prevMonthStart && d <= prevMonthEnd;
  });
  const expensesThisYear = allExpenses.filter(e => new Date(e.occurredAt) >= yearStart);

  const monthlyExpensesTotal = expensesThisMonth.reduce((sum, e) => sum + toNum(e.amount), 0);
  const yearlyExpensesTotal  = expensesThisYear.reduce((sum, e)  => sum + toNum(e.amount), 0);
  const prevMonthExpenses    = expensesPrevMonth.reduce((sum, e) => sum + toNum(e.amount), 0);
  const expensesMomPct       = calcMomPercent(monthlyExpensesTotal, prevMonthExpenses);

  const expensesByCat = new Map<ExpenseCategory, number>();
  for (const e of expensesThisMonth) {
    expensesByCat.set(e.category, (expensesByCat.get(e.category) ?? 0) + toNum(e.amount));
  }
  const categoryBreakdown = [...expensesByCat.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  // ── Net result ────────────────────────────────────────────────────────────

  const netResult   = monthlyTotal - monthlyExpensesTotal;
  const prevNet     = prevTotal - prevMonthExpenses;
  const netMomPct   = calcMomPercent(netResult, prevNet);
  const netPositive = netResult >= 0;

  // ── Alerts ────────────────────────────────────────────────────────────────

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

  for (const book of printBooks) {
    const stock = stockByBook.get(book.id) ?? 0;
    if (stock > 0 && stock <= LOW_STOCK_THRESHOLD) {
      alerts.push({ icon: "📦", text: `Stock bajo — "${book.title}" (${stock} ej.)`, href: "/libros" });
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

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
                  const itemName = sale.bookId
                    ? (bookMap.get(sale.bookId)?.title ?? "Libro")
                    : (sale.merchandise?.name ?? "Venta");
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
          {expensesThisMonth.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-2">Últimos gastos</p>
              <div className="divide-y divide-[var(--color-border)] -mx-5">
                {expensesThisMonth.slice(0, 5).map(exp => (
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
