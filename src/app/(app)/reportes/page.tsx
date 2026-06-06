import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateAccount } from "@/lib/account";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, toNum } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReportesTabNav from "@/components/reportes/ReportesTabNav";
import PeriodNav from "@/components/reportes/PeriodNav";
import ExportButton from "@/components/reportes/ExportButton";
import ProjectionChart from "@/components/reportes/ProjectionChart";
import GoalCalculator from "@/components/reportes/GoalCalculator";
import type { ProjectionPoint } from "@/components/reportes/ProjectionChart";
import type { ExpenseCategory } from "@/generated/prisma/client";
import {
  STOCK_SIGN,
  calcRecoveryPct,
  calcProjectionScenarios,
  calc3MonthAvg,
  calcMerchStock,
  getExchangeStatusMeta,
  calcOutstanding,
  saleToCLP,
} from "@/lib/finance";
import { CATEGORY_LABELS, CHANNEL_TYPE_LABEL } from "@/lib/labels";

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; period?: string }>;
}) {
  const { tab = "ventas", period = "mes" } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const account  = await getOrCreateAccount(user.id, user.email ?? "");
  const currency = account.baseCurrency;

  const now          = new Date();
  const monthStart   = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart    = new Date(now.getFullYear(), 0, 1);
  const twelveAgo    = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  // ── Fetch all data ────────────────────────────────────────────────────────

  const channels = await prisma.channel.findMany({
    where: { accountId: account.id },
    select: { id: true, name: true, type: true, currency: true, consignmentPercent: true, royaltyPercent: true, consignmentDays: true, consignmentStartAt: true },
    orderBy: { name: "asc" },
  });
  const channelIds  = channels.map(c => c.id);
  const channelMap  = new Map(channels.map(c => [c.id, c]));
  const baseFilter  = { channelId: { in: channelIds.length ? channelIds : ["__none__"] }, status: { not: "CANCELLED" as const } };

  const [allSales, allExpenses, allPayments, books, printRuns, bookMovements, allExchanges, merchandise] = await Promise.all([
    prisma.sale.findMany({
      where:   baseFilter,
      include: { channel: { select: { name: true, type: true } }, merchandise: { select: { name: true } } },
      orderBy: { saleDate: "desc" },
    }),
    prisma.expense.findMany({
      where:   { accountId: account.id },
      include: { book: { select: { title: true } } },
      orderBy: { occurredAt: "desc" },
    }),
    prisma.payment.findMany({
      where:  { channelId: { in: channelIds.length ? channelIds : ["__none__"] } },
      select: { channelId: true, amount: true },
    }),
    prisma.book.findMany({
      where: { accountId: account.id },
      select: { id: true, title: true, formats: true },
      orderBy: { title: "asc" },
    }),
    prisma.printRun.findMany({
      where:   { book: { accountId: account.id } },
      select:  { id: true, bookId: true, quantity: true, totalCost: true, receivedAt: true },
      orderBy: { receivedAt: "desc" },
    }),
    prisma.inventoryMovement.findMany({
      where:  { bookId: { not: null }, book: { accountId: account.id } },
      select: { bookId: true, channelId: true, type: true, quantity: true },
    }),
    prisma.exchange.findMany({
      where:   { book: { accountId: account.id } },
      include: { book: { select: { title: true } } },
      orderBy: { sentAt: "desc" },
    }),
    prisma.merchandise.findMany({
      where:   { accountId: account.id },
      include: {
        productionBatches: { select: { quantity: true, totalCost: true } },
        sales: { where: { status: { not: "CANCELLED" } }, select: { quantity: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  // ── Period filter ─────────────────────────────────────────────────────────

  const periodStart = period === "mes" ? monthStart : period === "año" ? yearStart : new Date(0);
  const salesInPeriod = allSales.filter(s => new Date(s.saleDate) >= periodStart);

  // ── Ventas aggregations ───────────────────────────────────────────────────

  const totalRevenue = salesInPeriod.reduce((s, x) => s + saleToCLP(x), 0);
  const totalUnits   = salesInPeriod.reduce((s, x) => s + x.quantity, 0);

  // By channel
  const byChannel = new Map<string, { revenue: number; units: number }>();
  for (const s of salesInPeriod) {
    const cur = byChannel.get(s.channelId) ?? { revenue: 0, units: 0 };
    byChannel.set(s.channelId, { revenue: cur.revenue + saleToCLP(s), units: cur.units + s.quantity });
  }
  const channelRows = [...byChannel.entries()]
    .map(([id, d]) => ({ channel: channelMap.get(id)!, ...d }))
    .filter(r => r.channel)
    .sort((a, b) => b.revenue - a.revenue);

  // By book
  const byBook = new Map<string, { revenue: number; units: number; title: string }>();
  for (const s of salesInPeriod.filter(s => s.bookId)) {
    const book = books.find(b => b.id === s.bookId);
    if (!book) continue;
    const cur = byBook.get(s.bookId!) ?? { revenue: 0, units: 0, title: book.title };
    byBook.set(s.bookId!, { ...cur, revenue: cur.revenue + saleToCLP(s), units: cur.units + s.quantity });
  }
  const bookRows = [...byBook.values()].sort((a, b) => b.revenue - a.revenue);

  // By merch
  const byMerch = new Map<string, { revenue: number; units: number; name: string }>();
  for (const s of salesInPeriod.filter(s => s.merchandiseId && s.merchandise)) {
    const key  = s.merchandiseId!;
    const name = s.merchandise!.name;
    const cur  = byMerch.get(key) ?? { revenue: 0, units: 0, name };
    byMerch.set(key, { ...cur, revenue: cur.revenue + saleToCLP(s), units: cur.units + s.quantity });
  }
  const merchRows = [...byMerch.values()].sort((a, b) => b.revenue - a.revenue);

  // ── Inventario aggregations ───────────────────────────────────────────────

  // Stock per book
  const stockByBook = new Map<string, number>();
  const inBookstoreByBook = new Map<string, number>();
  const inBookstoreByChannel = new Map<string, number>(); // channelId → total units there

  for (const m of bookMovements) {
    if (!m.bookId) continue;
    const sign = STOCK_SIGN[m.type] ?? 0;
    stockByBook.set(m.bookId, (stockByBook.get(m.bookId) ?? 0) + sign * m.quantity);
    if (m.type === "SEND_TO_BOOKSTORE") {
      inBookstoreByBook.set(m.bookId, (inBookstoreByBook.get(m.bookId) ?? 0) + m.quantity);
      if (m.channelId) inBookstoreByChannel.set(m.channelId, (inBookstoreByChannel.get(m.channelId) ?? 0) + m.quantity);
    }
    if (m.type === "BOOKSTORE_RETURN") {
      inBookstoreByBook.set(m.bookId, (inBookstoreByBook.get(m.bookId) ?? 0) - m.quantity);
      if (m.channelId) inBookstoreByChannel.set(m.channelId, (inBookstoreByChannel.get(m.channelId) ?? 0) - m.quantity);
    }
  }

  const printBooks = books.filter(b => b.formats.includes("PRINT"));

  // Outstanding per channel
  const salesByChannel   = new Map(channels.map(c => [c.id, allSales.filter(s => s.channelId === c.id).reduce((s, x) => s + saleToCLP(x), 0)]));
  const paymentsByChannel = new Map<string, number>();
  for (const p of allPayments) paymentsByChannel.set(p.channelId, (paymentsByChannel.get(p.channelId) ?? 0) + toNum(p.amount));

  const bookstoreChannels = channels.filter(c => c.type === "BOOKSTORE" && (inBookstoreByChannel.get(c.id) ?? 0) > 0);

  // Canjes summary
  const pendingCanjes     = allExchanges.filter(e => e.status === "PENDING");
  const fulfilledCanjes   = allExchanges.filter(e => e.status === "FULFILLED");
  const unfulfilledCanjes = allExchanges.filter(e => e.status === "UNFULFILLED");
  const overdueCanjes     = pendingCanjes.filter(e => e.deadlineAt && new Date(e.deadlineAt) < now);

  // ── Finanzas aggregations ─────────────────────────────────────────────────

  const expenseByCategory = new Map<ExpenseCategory, number>();
  for (const e of allExpenses) expenseByCategory.set(e.category, (expenseByCategory.get(e.category) ?? 0) + toNum(e.amount));
  const totalExpenses = [...expenseByCategory.values()].reduce((s, v) => s + v, 0);
  const expenseCategoryRows = [...expenseByCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => ({ cat, amt, pct: totalExpenses > 0 ? (amt / totalExpenses) * 100 : 0 }));

  // Print run P&L per book
  const totalPrintCostByBook = new Map<string, number>();
  for (const r of printRuns) totalPrintCostByBook.set(r.bookId, (totalPrintCostByBook.get(r.bookId) ?? 0) + toNum(r.totalCost));

  const printBookPnl = printBooks
    .map(b => ({
      title:      b.title,
      printCost:  totalPrintCostByBook.get(b.id) ?? 0,
      revenue:    allSales.filter(s => s.bookId === b.id).reduce((s, x) => s + saleToCLP(x), 0),
      tiradas:    printRuns.filter(r => r.bookId === b.id).length,
    }))
    .filter(b => b.printCost > 0)
    .map(b => ({ ...b, recovered: Math.min(b.revenue, b.printCost), pct: calcRecoveryPct(b.revenue, b.printCost) }));

  // Merch P&L
  const merchPnl = merchandise.map(m => ({
    name:     m.name,
    cost:     m.productionBatches.reduce((s, b) => s + toNum(b.totalCost), 0),
    revenue:  allSales.filter(s => s.merchandiseId === m.id).reduce((s, x) => s + saleToCLP(x), 0),
    units:    m.sales.reduce((s, x) => s + x.quantity, 0),
  })).filter(m => m.cost > 0 || m.revenue > 0);

  // ── Proyecciones ──────────────────────────────────────────────────────────

  const histMonths: { label: string; start: Date; end: Date }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    histMonths.push({
      label: d.toLocaleString("es-CL", { month: "short" }).replace(".", ""),
      start: d,
      end:   new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59),
    });
  }

  const historicalRevenue = histMonths.map(({ label, start, end }) => ({
    label,
    revenue: allSales.filter(s => { const d = new Date(s.saleDate); return d >= start && d <= end; }).reduce((s, x) => s + saleToCLP(x), 0),
  }));

  const last3Avg = calc3MonthAvg(historicalRevenue.map(m => m.revenue));
  const currentMonthRevenue = historicalRevenue[historicalRevenue.length - 1].revenue;
  const currentMonthLabel   = histMonths[histMonths.length - 1].label;

  const projectedMonths: ProjectionPoint[] = [];
  for (let i = 1; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const scenarios = calcProjectionScenarios(last3Avg);
    projectedMonths.push({
      month:       d.toLocaleString("es-CL", { month: "short" }).replace(".", ""),
      ...scenarios,
    });
  }

  const chartData: ProjectionPoint[] = [
    ...historicalRevenue.map(m => ({ month: m.label, historico: Math.round(m.revenue) })),
    ...projectedMonths,
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="p-5 md:p-8 max-w-5xl">
      <header className="mb-7 flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold text-[var(--color-text)]" style={{ fontFamily: "var(--font-heading)" }}>
          Reportes
        </h1>
        <ExportButton tab="all" />
      </header>

      <Suspense>
        <ReportesTabNav />
      </Suspense>

      {/* ── VENTAS ────────────────────────────────────────────────────────── */}
      {tab === "ventas" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-3">
            <Suspense>
              <PeriodNav />
            </Suspense>
            <ExportButton tab="ventas" size="sm" />
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Ingresos",  value: formatCurrency(totalRevenue, currency) },
              { label: "Unidades",  value: String(totalUnits) },
              { label: "Registros", value: String(salesInPeriod.length) },
            ].map(({ label, value }) => (
              <Card key={label} className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
                <CardHeader className="pb-1 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">{label}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-4 pb-4">
                  <p className="text-xl font-semibold text-[var(--color-text)]" style={{ fontFamily: "var(--font-heading)" }}>{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* By channel */}
          {channelRows.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-[var(--color-text)] mb-3" style={{ fontFamily: "var(--font-heading)" }}>Por canal</h2>
              <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
                <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-2.5 border-b border-[var(--color-border)]">
                  {["Canal", "Tipo", "Unidades", "Ingresos", "% total"].map((h, i) => (
                    <span key={h} className={`text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide ${i > 0 ? "text-right" : ""}`}>{h}</span>
                  ))}
                </div>
                <div className="divide-y divide-[var(--color-border)]">
                  {channelRows.map(({ channel, revenue, units }) => {
                    const pct = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;
                    return (
                      <div key={channel.id} className="flex md:grid md:grid-cols-[1fr_auto_auto_auto_auto] items-center gap-3 md:gap-4 px-5 py-3.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--color-text)] truncate">{channel.name}</p>
                          <div className="mt-1 h-1 rounded-full bg-[var(--color-border)] max-w-[120px]">
                            <div className="h-1 rounded-full bg-[var(--color-accent)]" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-[10px] px-2 py-0 bg-[var(--color-accent-light)] text-[var(--color-accent)] border-0 shrink-0">
                          {CHANNEL_TYPE_LABEL[channel.type]}
                        </Badge>
                        <span className="text-sm text-[var(--color-text)] text-right">{units}</span>
                        <span className="text-sm font-semibold text-[var(--color-text)] text-right">{formatCurrency(revenue, currency)}</span>
                        <span className="text-sm text-[var(--color-text-muted)] text-right">{pct.toFixed(0)}%</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </section>
          )}

          {/* By book */}
          {bookRows.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-[var(--color-text)] mb-3" style={{ fontFamily: "var(--font-heading)" }}>Por libro</h2>
              <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
                <div className="divide-y divide-[var(--color-border)]">
                  {bookRows.map(row => {
                    const pct = totalRevenue > 0 ? (row.revenue / totalRevenue) * 100 : 0;
                    return (
                      <div key={row.title} className="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-3.5 items-center">
                        <div>
                          <p className="text-sm font-medium text-[var(--color-text)]">{row.title}</p>
                          <div className="mt-1 h-1 rounded-full bg-[var(--color-border)] max-w-[160px]">
                            <div className="h-1 rounded-full bg-[var(--color-accent)]" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <span className="text-sm text-[var(--color-text-muted)] text-right">{row.units} ej.</span>
                        <span className="text-sm font-semibold text-[var(--color-text)] text-right">{formatCurrency(row.revenue, currency)}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </section>
          )}

          {/* By merch */}
          {merchRows.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-[var(--color-text)] mb-3" style={{ fontFamily: "var(--font-heading)" }}>Por merchandising</h2>
              <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
                <div className="divide-y divide-[var(--color-border)]">
                  {merchRows.map(row => (
                    <div key={row.name} className="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-3.5 items-center">
                      <p className="text-sm font-medium text-[var(--color-text)]">{row.name}</p>
                      <span className="text-sm text-[var(--color-text-muted)] text-right">{row.units} ej.</span>
                      <span className="text-sm font-semibold text-[var(--color-text)] text-right">{formatCurrency(row.revenue, currency)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </section>
          )}

          {salesInPeriod.length === 0 && (
            <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
              <CardContent className="py-16 text-center">
                <p className="text-sm font-medium text-[var(--color-text)]">Sin ventas en este período</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">Registra ventas con el botón + para ver el reporte</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── INVENTARIO ────────────────────────────────────────────────────── */}
      {tab === "inventario" && (
        <div className="space-y-7">
          <div className="flex justify-end">
            <ExportButton tab="inventario" size="sm" />
          </div>
          {/* Stock de libros */}
          <section>
            <h2 className="text-sm font-semibold text-[var(--color-text)] mb-3" style={{ fontFamily: "var(--font-heading)" }}>Stock de libros impresos</h2>
            {printBooks.length === 0 ? (
              <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
                <CardContent className="py-10 text-center">
                  <p className="text-sm text-[var(--color-text-muted)]">Sin libros en formato impreso</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
                <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-2.5 border-b border-[var(--color-border)]">
                  {["Libro", "En mano", "En librerías", "Total impreso"].map((h, i) => (
                    <span key={h} className={`text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide ${i > 0 ? "text-right" : ""}`}>{h}</span>
                  ))}
                </div>
                <div className="divide-y divide-[var(--color-border)]">
                  {printBooks.map(book => {
                    const inHand      = Math.max(0, stockByBook.get(book.id) ?? 0);
                    const inStores    = Math.max(0, inBookstoreByBook.get(book.id) ?? 0);
                    const totalPrinted = printRuns.filter(r => r.bookId === book.id).reduce((s, r) => s + r.quantity, 0);
                    return (
                      <div key={book.id} className="flex md:grid md:grid-cols-[1fr_auto_auto_auto] items-center gap-3 md:gap-4 px-5 py-3.5">
                        <p className="text-sm font-medium text-[var(--color-text)] flex-1">{book.title}</p>
                        <span className={`text-sm font-semibold text-right ${inHand <= 5 && inHand > 0 ? "text-[var(--color-warning)]" : inHand === 0 ? "text-[var(--color-danger)]" : "text-[var(--color-text)]"}`}>{inHand}</span>
                        <span className="text-sm text-[var(--color-text)] text-right">{inStores}</span>
                        <span className="text-sm text-[var(--color-text-muted)] text-right">{totalPrinted}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </section>

          {/* Stock de merch */}
          {merchandise.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-[var(--color-text)] mb-3" style={{ fontFamily: "var(--font-heading)" }}>Stock de merchandising</h2>
              <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
                <div className="divide-y divide-[var(--color-border)]">
                  {merchandise.map(m => {
                    const batched  = m.productionBatches.reduce((s, b) => s + b.quantity, 0);
                    const sold     = m.sales.reduce((s, x) => s + x.quantity, 0);
                    const stock    = calcMerchStock(batched, sold);
                    const color    = stock <= 0 ? "text-[var(--color-danger)]" : stock <= 5 ? "text-[var(--color-warning)]" : "text-[var(--color-text)]";
                    return (
                      <div key={m.id} className="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-3.5 items-center">
                        <div>
                          <p className="text-sm font-medium text-[var(--color-text)]">{m.name}</p>
                          {!m.isActive && <span className="text-[10px] text-[var(--color-text-muted)]">Descontinuado</span>}
                        </div>
                        <span className="text-xs text-[var(--color-text-muted)] text-right">{batched} producidos</span>
                        <span className={`text-sm font-semibold text-right ${color}`}>{stock} en mano</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </section>
          )}

          {/* Estado de consignaciones */}
          <section>
            <h2 className="text-sm font-semibold text-[var(--color-text)] mb-3" style={{ fontFamily: "var(--font-heading)" }}>Estado de consignaciones</h2>
            {bookstoreChannels.length === 0 ? (
              <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
                <CardContent className="py-10 text-center">
                  <p className="text-sm text-[var(--color-text-muted)]">Sin libros en librerías actualmente</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
                <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-2.5 border-b border-[var(--color-border)]">
                  {["Librería", "Stock actual", "Vendido", "Pendiente cobro"].map((h, i) => (
                    <span key={h} className={`text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide ${i > 0 ? "text-right" : ""}`}>{h}</span>
                  ))}
                </div>
                <div className="divide-y divide-[var(--color-border)]">
                  {bookstoreChannels.map(ch => {
                    const stock       = Math.max(0, inBookstoreByChannel.get(ch.id) ?? 0);
                    const totalSales  = salesByChannel.get(ch.id) ?? 0;
                    const totalPaid   = paymentsByChannel.get(ch.id) ?? 0;
                    const outstanding = calcOutstanding(totalSales, totalPaid);
                    return (
                      <div key={ch.id} className="flex md:grid md:grid-cols-[1fr_auto_auto_auto] items-center gap-3 md:gap-4 px-5 py-3.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--color-text)]">{ch.name}</p>
                          {ch.consignmentPercent && <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{toNum(ch.consignmentPercent)}% librería</p>}
                        </div>
                        <span className={`text-sm font-semibold text-right ${stock <= 5 && stock > 0 ? "text-[var(--color-warning)]" : "text-[var(--color-text)]"}`}>{stock} ej.</span>
                        <span className="text-sm text-[var(--color-text-muted)] text-right">{formatCurrency(totalSales, currency)}</span>
                        <span className={`text-sm font-semibold text-right ${outstanding > 0 ? "text-[var(--color-warning)]" : "text-[var(--color-success)]"}`}>
                          {outstanding > 0 ? formatCurrency(outstanding, currency) : "✓ Al día"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </section>

          {/* Canjes */}
          <section>
            <h2 className="text-sm font-semibold text-[var(--color-text)] mb-3" style={{ fontFamily: "var(--font-heading)" }}>Canjes y colaboraciones</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                { label: "Total",       value: allExchanges.length,      color: ""                           },
                { label: "Pendientes",  value: pendingCanjes.length,      color: "text-[var(--color-warning)]" },
                { label: "Cumplidos",   value: fulfilledCanjes.length,    color: "text-[var(--color-success)]" },
                { label: "Vencidos",    value: overdueCanjes.length,      color: overdueCanjes.length > 0 ? "text-[var(--color-danger)]" : "" },
              ].map(({ label, value, color }) => (
                <Card key={label} className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
                  <CardContent className="p-4">
                    <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">{label}</p>
                    <p className={`text-2xl font-semibold mt-1 ${color || "text-[var(--color-text)]"}`} style={{ fontFamily: "var(--font-heading)" }}>{value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            {allExchanges.length > 0 && (
              <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
                <div className="divide-y divide-[var(--color-border)]">
                  {allExchanges.slice(0, 10).map(ex => {
                    const { dot } = getExchangeStatusMeta(ex.status, ex.deadlineAt, now);
                    const isOverdue = ex.status === "PENDING" && ex.deadlineAt !== null && new Date(ex.deadlineAt) < now;
                    return (
                      <div key={ex.id} className="flex items-center gap-3 px-5 py-3.5">
                        <span className="text-base">{dot}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--color-text)] truncate">{ex.recipient}</p>
                          <p className="text-xs text-[var(--color-text-muted)]">{ex.book.title} · {ex.quantity} ej. · {formatDate(ex.sentAt)}</p>
                        </div>
                        {ex.deadlineAt && (
                          <span className={`text-xs shrink-0 ${isOverdue ? "text-[var(--color-danger)]" : "text-[var(--color-text-muted)]"}`}>
                            Límite: {formatDate(ex.deadlineAt)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </section>
        </div>
      )}

      {/* ── FINANZAS ──────────────────────────────────────────────────────── */}
      {tab === "finanzas" && (
        <div className="space-y-7">
          <div className="flex justify-end">
            <ExportButton tab="finanzas" size="sm" />
          </div>
          {/* Expenses by category */}
          <section>
            <h2 className="text-sm font-semibold text-[var(--color-text)] mb-3" style={{ fontFamily: "var(--font-heading)" }}>Gastos por categoría</h2>
            {expenseCategoryRows.length === 0 ? (
              <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
                <CardContent className="py-10 text-center"><p className="text-sm text-[var(--color-text-muted)]">Sin gastos registrados</p></CardContent>
              </Card>
            ) : (
              <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
                <div className="divide-y divide-[var(--color-border)]">
                  {expenseCategoryRows.map(({ cat, amt, pct }) => (
                    <div key={cat} className="flex items-center gap-4 px-5 py-3.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--color-text)]">{CATEGORY_LABELS[cat]}</p>
                        <div className="mt-1 h-1 rounded-full bg-[var(--color-border)]">
                          <div className="h-1 rounded-full bg-[var(--color-accent)]" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <span className="text-xs text-[var(--color-text-muted)] shrink-0">{pct.toFixed(0)}%</span>
                      <span className="text-sm font-semibold text-[var(--color-text)] shrink-0 w-28 text-right">{formatCurrency(amt, currency)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-5 py-3 bg-[var(--color-accent-light)]/40">
                    <span className="text-xs font-semibold text-[var(--color-text)]">Total gastos</span>
                    <span className="text-sm font-semibold text-[var(--color-accent)]">{formatCurrency(totalExpenses, currency)}</span>
                  </div>
                </div>
              </Card>
            )}
          </section>

          {/* Print run P&L */}
          {printBookPnl.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-[var(--color-text)] mb-1" style={{ fontFamily: "var(--font-heading)" }}>Recuperación de inversión por tiradas</h2>
              <p className="text-xs text-[var(--color-text-muted)] mb-3">Ingresos vs. costos de impresión. Para el resultado neto completo ve a Finanzas → Rentabilidad.</p>
              <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
                <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-2.5 border-b border-[var(--color-border)]">
                  {["Libro", "Tiradas", "Costo impresión", "Ingresos", "Resultado"].map((h, i) => (
                    <span key={h} className={`text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide ${i > 0 ? "text-right" : ""}`}>{h}</span>
                  ))}
                </div>
                <div className="divide-y divide-[var(--color-border)]">
                  {printBookPnl.map(row => {
                    const net = row.revenue - row.printCost;
                    return (
                      <div key={row.title} className="px-5 py-4">
                        <div className="flex md:grid md:grid-cols-[1fr_auto_auto_auto_auto] items-center gap-3 md:gap-4">
                          <p className="text-sm font-medium text-[var(--color-text)] flex-1">{row.title}</p>
                          <span className="hidden md:block text-sm text-[var(--color-text-muted)] text-right">{row.tiradas}</span>
                          <span className="hidden md:block text-sm text-[var(--color-text)] text-right">{formatCurrency(row.printCost, currency)}</span>
                          <span className="hidden md:block text-sm text-[var(--color-text)] text-right">{formatCurrency(row.revenue, currency)}</span>
                          <span className={`text-sm font-semibold text-right ${net >= 0 ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>
                            {net >= 0 ? "+" : ""}{formatCurrency(net, currency)}
                          </span>
                        </div>
                        <div className="mt-2">
                          <div className="h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
                            <div className={`h-1.5 rounded-full ${row.pct >= 100 ? "bg-[var(--color-success)]" : "bg-[var(--color-accent)]"}`} style={{ width: `${row.pct}%` }} />
                          </div>
                          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{row.pct.toFixed(0)}% recuperado</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </section>
          )}

          {/* Merch P&L */}
          {merchPnl.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-[var(--color-text)] mb-3" style={{ fontFamily: "var(--font-heading)" }}>Rentabilidad de merchandising</h2>
              <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
                <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-2.5 border-b border-[var(--color-border)]">
                  {["Producto", "Unidades", "Costo prod.", "Ingresos", "Resultado"].map((h, i) => (
                    <span key={h} className={`text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide ${i > 0 ? "text-right" : ""}`}>{h}</span>
                  ))}
                </div>
                <div className="divide-y divide-[var(--color-border)]">
                  {merchPnl.map(row => {
                    const net = row.revenue - row.cost;
                    return (
                      <div key={row.name} className="flex md:grid md:grid-cols-[1fr_auto_auto_auto_auto] items-center gap-3 md:gap-4 px-5 py-3.5">
                        <p className="text-sm font-medium text-[var(--color-text)] flex-1">{row.name}</p>
                        <span className="hidden md:block text-sm text-[var(--color-text-muted)] text-right">{row.units}</span>
                        <span className="hidden md:block text-sm text-[var(--color-text)] text-right">{formatCurrency(row.cost, currency)}</span>
                        <span className="hidden md:block text-sm text-[var(--color-text)] text-right">{formatCurrency(row.revenue, currency)}</span>
                        <span className={`text-sm font-semibold text-right ${net >= 0 ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>
                          {net >= 0 ? "+" : ""}{formatCurrency(net, currency)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </section>
          )}

          {/* ¿Qué me deben? — summary + link to the actionable view */}
          <section>
            <h2 className="text-sm font-semibold text-[var(--color-text)] mb-3" style={{ fontFamily: "var(--font-heading)" }}>¿Qué me deben?</h2>
            {(() => {
              const totalOutstanding = channels
                .filter(c => c.type === "BOOKSTORE" || c.type === "DIGITAL")
                .reduce((sum, ch) => sum + calcOutstanding(salesByChannel.get(ch.id) ?? 0, paymentsByChannel.get(ch.id) ?? 0), 0);
              return (
                <a href="/finanzas?tab=deben"
                  className="flex items-center justify-between gap-4 px-5 py-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] hover:border-[var(--color-accent)] transition-colors">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">
                      {totalOutstanding > 0
                        ? `${formatCurrency(totalOutstanding, currency)} pendientes de cobro`
                        : "Todo cobrado — al día con todos los canales"}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      Gestiona cobros y registra pagos en Finanzas
                    </p>
                  </div>
                  <span className={`text-lg font-semibold shrink-0 ${totalOutstanding > 0 ? "text-[var(--color-warning)]" : "text-[var(--color-success)]"}`}
                    style={{ fontFamily: "var(--font-heading)" }}>
                    {totalOutstanding > 0 ? formatCurrency(totalOutstanding, currency) : "✓"}
                  </span>
                </a>
              );
            })()}
          </section>
        </div>
      )}

      {/* ── PROYECCIONES ──────────────────────────────────────────────────── */}
      {tab === "proyecciones" && (
        <div className="space-y-7">
          <div className="flex justify-end">
            <ExportButton tab="proyecciones" size="sm" />
          </div>
          {/* Chart */}
          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-sm font-semibold text-[var(--color-text)]" style={{ fontFamily: "var(--font-heading)" }}>
                Proyección de ingresos — próximos 6 meses
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">Basado en promedio de los últimos 3 meses</p>
            </div>
            <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
              <CardContent className="pr-4 py-5">
                <Suspense fallback={<div className="h-[240px]" />}>
                  <ProjectionChart data={chartData} splitAt={currentMonthLabel} />
                </Suspense>
              </CardContent>
            </Card>
          </section>

          {/* Projection table */}
          {last3Avg > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-[var(--color-text)] mb-3" style={{ fontFamily: "var(--font-heading)" }}>Desglose de escenarios</h2>
              <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-2.5 border-b border-[var(--color-border)]">
                  {["Mes", "Conservador (−20%)", "Realista", "Optimista (+20%)"].map((h, i) => (
                    <span key={h} className={`text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide ${i > 0 ? "text-right" : ""}`}>{h}</span>
                  ))}
                </div>
                <div className="divide-y divide-[var(--color-border)]">
                  {projectedMonths.map(m => (
                    <div key={m.month} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 items-center">
                      <span className="text-sm font-medium text-[var(--color-text)] capitalize">{m.month}</span>
                      <span className="text-sm text-[var(--color-text-muted)] text-right">{formatCurrency(m.conservador!, currency)}</span>
                      <span className="text-sm font-semibold text-[var(--color-text)] text-right">{formatCurrency(m.realista!, currency)}</span>
                      <span className="text-sm text-[var(--color-success)] text-right">{formatCurrency(m.optimista!, currency)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </section>
          )}

          {/* Goal calculator */}
          <section>
            <h2 className="text-sm font-semibold text-[var(--color-text)] mb-3" style={{ fontFamily: "var(--font-heading)" }}>Calculadora de meta</h2>
            <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
              <CardContent className="p-6">
                <GoalCalculator
                  currentMonthRevenue={currentMonthRevenue}
                  avg3Month={last3Avg}
                  currency={currency}
                />
              </CardContent>
            </Card>
          </section>
        </div>
      )}
    </main>
  );
}
