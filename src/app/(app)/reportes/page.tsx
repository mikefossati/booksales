import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateAccount } from "@/lib/account";
import { formatCurrency, formatDate, toNum } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReportesTabNav from "@/components/reportes/ReportesTabNav";
import PeriodNav from "@/components/reportes/PeriodNav";
import ExportButton from "@/components/reportes/ExportButton";
import { getCachedReportesData } from "@/lib/data-cache";
import ProjectionChart from "@/components/reportes/ProjectionChart";
import GoalCalculator from "@/components/reportes/GoalCalculator";
import type { ProjectionPoint } from "@/components/reportes/ProjectionChart";
import type { ExpenseCategory } from "@/generated/prisma/client";
import {
  calcStockMatrix,
  calcRecoveryPct,
  calcProjectionScenarios,
  calc3MonthAvg,
  calcMerchStock,
  getExchangeStatusMeta,
  calcOutstanding,
  saleToCLP,
  calcCuadreRow,
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

  const {
    channels, allSales, allExpenses, allPayments,
    books, printRuns, bookMovements, allExchanges, merchandise, inventories,
  } = await getCachedReportesData(account.id);

  const channelIds = channels.map(c => c.id);
  const channelMap = new Map(channels.map(c => [c.id, c]));

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

  // Stock per (inventory, book) from the movement ledger
  const stockMatrix = calcStockMatrix(bookMovements);
  const printBooks  = books.filter(b => b.formats.includes("PRINT"));

  const inventoryTotals = new Map<string, number>(); // inventoryId → units across books
  for (const [invId, byBook] of stockMatrix) {
    inventoryTotals.set(invId, [...byBook.values()].reduce((s, v) => s + v, 0));
  }

  // Outstanding per channel
  const salesByChannel   = new Map(channels.map(c => [c.id, allSales.filter(s => s.channelId === c.id).reduce((s, x) => s + saleToCLP(x), 0)]));
  const paymentsByChannel = new Map<string, number>();
  for (const p of allPayments) paymentsByChannel.set(p.channelId, (paymentsByChannel.get(p.channelId) ?? 0) + toNum(p.amount));

  const bookstoreChannels = channels.filter(c =>
    c.type === "BOOKSTORE" && c.inventoryId && (inventoryTotals.get(c.inventoryId) ?? 0) !== 0,
  );

  // Canjes summary
  const pendingCanjes     = allExchanges.filter(e => e.status === "PENDING");
  const fulfilledCanjes   = allExchanges.filter(e => e.status === "FULFILLED");
  const unfulfilledCanjes = allExchanges.filter(e => e.status === "UNFULFILLED");
  const overdueCanjes     = pendingCanjes.filter(e => e.deadlineAt && new Date(e.deadlineAt) < now);

  // ── Cuadre de ejemplares ─────────────────────────────────────────────────

  const defaultInvIds   = new Set(inventories.filter(i => i.isDefault).map(i => i.id));
  const bookstoreInvIds = new Set(
    inventories.filter(i => !i.isDefault && i.channels.some(c => c.type === "BOOKSTORE")).map(i => i.id),
  );

  const cuadreRows = printBooks
    .map(book => {
      const totalPrinted = printRuns
        .filter(r => r.bookId === book.id)
        .reduce((s, r) => s + r.quantity, 0);
      if (totalPrinted === 0) return null;

      const sold       = allSales.filter(s => s.bookId === book.id).reduce((s, x) => s + x.quantity, 0);
      const exchanged  = allExchanges.filter(e => e.bookId === book.id).reduce((s, e) => s + e.quantity, 0);
      const writtenOff = bookMovements.filter(m => m.bookId === book.id && m.type === "WRITEOFF").reduce((s, m) => s + m.quantity, 0);

      return {
        book,
        ...calcCuadreRow({ bookId: book.id, totalPrinted, sold, exchanged, writtenOff, stockMatrix, defaultInvIds, bookstoreInvIds }),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const cuadreTotals = cuadreRows.reduce(
    (acc, r) => ({
      totalPrinted: acc.totalPrinted + r.totalPrinted,
      inPersonal:   acc.inPersonal   + r.inPersonal,
      inBookstores: acc.inBookstores + r.inBookstores,
      inOther:      acc.inOther      + r.inOther,
      sold:         acc.sold         + r.sold,
      exchanged:    acc.exchanged    + r.exchanged,
      writtenOff:   acc.writtenOff   + r.writtenOff,
      discrepancy:  acc.discrepancy  + r.discrepancy,
    }),
    { totalPrinted: 0, inPersonal: 0, inBookstores: 0, inOther: 0, sold: 0, exchanged: 0, writtenOff: 0, discrepancy: 0 },
  );

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
                <div className="hidden md:grid grid-cols-[minmax(0,1fr)_88px_72px_110px_56px] gap-4 px-5 py-2.5 border-b border-[var(--color-border)]">
                  {["Canal", "Tipo", "Unidades", "Ingresos", "% total"].map((h, i) => (
                    <span key={h} className={`text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide ${i > 0 ? "text-right" : ""}`}>{h}</span>
                  ))}
                </div>
                <div className="divide-y divide-[var(--color-border)]">
                  {channelRows.map(({ channel, revenue, units }) => {
                    const pct = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;
                    return (
                      <div key={channel.id} className="flex md:grid md:grid-cols-[minmax(0,1fr)_88px_72px_110px_56px] items-center gap-3 md:gap-4 px-5 py-3.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--color-text)] truncate">{channel.name}</p>
                          <div className="mt-1 h-1 rounded-full bg-[var(--color-border)] max-w-[120px]">
                            <div className="h-1 rounded-full bg-[var(--color-accent)]" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-[11px] px-2 py-0 bg-[var(--color-accent-light)] text-[var(--color-accent)] border-0 shrink-0">
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
                      <div key={row.title} className="grid grid-cols-[minmax(0,1fr)_72px_110px] gap-4 px-5 py-3.5 items-center">
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
                    <div key={row.name} className="grid grid-cols-[minmax(0,1fr)_72px_110px] gap-4 px-5 py-3.5 items-center">
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
          {/* Existencias por inventario */}
          <section>
            <h2 className="text-sm font-semibold text-[var(--color-text)] mb-3" style={{ fontFamily: "var(--font-heading)" }}>Existencias por inventario</h2>
            {printBooks.length === 0 ? (
              <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
                <CardContent className="py-10 text-center">
                  <p className="text-sm text-[var(--color-text-muted)]">Sin libros en formato impreso</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)] overflow-x-auto">
                <div className="min-w-fit">
                  <div className="grid gap-4 px-5 py-2.5 border-b border-[var(--color-border)]"
                    style={{ gridTemplateColumns: `minmax(140px,1fr) repeat(${inventories.length}, 88px) 72px 88px` }}>
                    <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Libro</span>
                    {inventories.map(inv => (
                      <span key={inv.id} className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide text-right max-w-28 truncate" title={inv.name}>
                        {inv.name}
                      </span>
                    ))}
                    <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide text-right">Total</span>
                    <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide text-right">Impreso</span>
                  </div>
                  <div className="divide-y divide-[var(--color-border)]">
                    {printBooks.map(book => {
                      const perInv = inventories.map(inv => stockMatrix.get(inv.id)?.get(book.id) ?? 0);
                      const total  = perInv.reduce((s, v) => s + v, 0);
                      const totalPrinted = printRuns.filter(r => r.bookId === book.id).reduce((s, r) => s + r.quantity, 0);
                      return (
                        <div key={book.id} className="grid items-center gap-4 px-5 py-3.5"
                          style={{ gridTemplateColumns: `minmax(140px,1fr) repeat(${inventories.length}, 88px) 72px 88px` }}>
                          <p className="text-sm font-medium text-[var(--color-text)]">{book.title}</p>
                          {perInv.map((stock, i) => (
                            <span key={inventories[i].id}
                              className={`text-sm text-right ${stock < 0 ? "text-[var(--color-danger)] font-semibold" : stock === 0 ? "text-[var(--color-text-muted)]" : "text-[var(--color-text)]"}`}>
                              {stock}
                            </span>
                          ))}
                          <span className={`text-sm font-semibold text-right ${total < 0 ? "text-[var(--color-danger)]" : "text-[var(--color-text)]"}`}>{total}</span>
                          <span className="text-sm text-[var(--color-text-muted)] text-right">{totalPrinted}</span>
                        </div>
                      );
                    })}
                  </div>
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
                    const color    = stock <= 0 ? "text-[var(--color-danger)]" : stock <= 5 ? "text-[var(--color-warning-text)]" : "text-[var(--color-text)]";
                    return (
                      <div key={m.id} className="grid grid-cols-[minmax(0,1fr)_120px_110px] gap-4 px-5 py-3.5 items-center">
                        <div>
                          <p className="text-sm font-medium text-[var(--color-text)]">{m.name}</p>
                          {!m.isActive && <span className="text-xs text-[var(--color-text-muted)]">Descontinuado</span>}
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
                <div className="hidden md:grid grid-cols-[minmax(0,1fr)_96px_110px_130px] gap-4 px-5 py-2.5 border-b border-[var(--color-border)]">
                  {["Librería", "Stock actual", "Vendido", "Pendiente cobro"].map((h, i) => (
                    <span key={h} className={`text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide ${i > 0 ? "text-right" : ""}`}>{h}</span>
                  ))}
                </div>
                <div className="divide-y divide-[var(--color-border)]">
                  {bookstoreChannels.map(ch => {
                    const stock       = ch.inventoryId ? (inventoryTotals.get(ch.inventoryId) ?? 0) : 0;
                    const totalSales  = salesByChannel.get(ch.id) ?? 0;
                    const totalPaid   = paymentsByChannel.get(ch.id) ?? 0;
                    const outstanding = calcOutstanding(totalSales, totalPaid);
                    return (
                      <div key={ch.id} className="flex md:grid md:grid-cols-[minmax(0,1fr)_96px_110px_130px] items-center gap-3 md:gap-4 px-5 py-3.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--color-text)]">{ch.name}</p>
                        </div>
                        <span className={`text-sm font-semibold text-right ${stock <= 5 && stock > 0 ? "text-[var(--color-warning-text)]" : "text-[var(--color-text)]"}`}>{stock} ej.</span>
                        <span className="text-sm text-[var(--color-text-muted)] text-right">{formatCurrency(totalSales, currency)}</span>
                        <span className={`text-sm font-semibold text-right ${outstanding > 0 ? "text-[var(--color-warning-text)]" : "text-[var(--color-success)]"}`}>
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
                { label: "Pendientes",  value: pendingCanjes.length,      color: "text-[var(--color-warning-text)]" },
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

      {/* ── CUADRE ────────────────────────────────────────────────────────── */}
      {tab === "cuadre" && (
        <div className="space-y-4">
          {cuadreRows.length === 0 ? (
            <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
              <CardContent className="py-16 text-center">
                <p className="text-sm font-medium text-[var(--color-text)]">Sin tiradas registradas</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">Registra tiradas de impresión para ver el cuadre de ejemplares</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {cuadreRows.map(row => {
                const { book, totalPrinted, inPersonal, inBookstores, inOther, sold, exchanged, writtenOff, discrepancy } = row;
                const cuadra = discrepancy === 0;
                const segments = [
                  { label: "En mano",        value: inPersonal,   color: "bg-[var(--color-accent)]"   },
                  { label: "En librerías",   value: inBookstores, color: "bg-orange-400"              },
                  ...(inOther > 0 ? [{ label: "Otros",           value: inOther,      color: "bg-sky-400"                  }] : []),
                  { label: "Vendidos",       value: sold,         color: "bg-[var(--color-success)]"  },
                  { label: "Canjes/Regalos", value: exchanged,    color: "bg-purple-400"              },
                  { label: "Bajas",          value: writtenOff,   color: "bg-[var(--color-border)]"   },
                  ...(discrepancy > 0 ? [{ label: "Sin contabilizar", value: discrepancy, color: "bg-[var(--color-danger)]" }] : []),
                ];
                return (
                  <Card key={book.id} className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
                    <CardContent className="p-5">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-semibold text-[var(--color-text)]">{book.title}</p>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          cuadra
                            ? "bg-[var(--color-success)]/15 text-[var(--color-success)]"
                            : discrepancy > 0
                            ? "bg-[var(--color-danger)]/15 text-[var(--color-danger)]"
                            : "bg-[var(--color-warning)]/15 text-[var(--color-warning-text)]"
                        }`}>
                          {cuadra
                            ? "✅ Cuadra"
                            : discrepancy > 0
                            ? `⚠️ ${discrepancy} ej. sin contabilizar`
                            : `⚠️ ${Math.abs(discrepancy)} ej. de más`}
                        </span>
                      </div>

                      {/* Stacked bar */}
                      <div className="h-2.5 rounded-full overflow-hidden flex mb-4 bg-[var(--color-border)]">
                        {segments.filter(s => s.value > 0).map(s => (
                          <div
                            key={s.label}
                            className={`h-full ${s.color} transition-all`}
                            style={{ width: `${Math.max((s.value / totalPrinted) * 100, 0)}%` }}
                            title={`${s.label}: ${s.value}`}
                          />
                        ))}
                      </div>

                      {/* Legend + numbers */}
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-x-4 gap-y-3">
                        {[
                          { label: "Impresos",       value: totalPrinted, accent: "font-bold text-[var(--color-text)]",          dot: null         },
                          { label: "En mano",        value: inPersonal,   accent: "text-[var(--color-text)]",                   dot: "bg-[var(--color-accent)]"  },
                          { label: "En librerías",   value: inBookstores, accent: "text-[var(--color-text)]",                   dot: "bg-orange-400"              },
                          ...(inOther > 0 ? [{ label: "Otros inv.",     value: inOther,      accent: "text-[var(--color-text)]",   dot: "bg-sky-400"     }] : []),
                          { label: "Vendidos",       value: sold,         accent: "text-[var(--color-text)]",                   dot: "bg-[var(--color-success)]" },
                          { label: "Canjes/Regalos", value: exchanged,    accent: "text-[var(--color-text)]",                   dot: "bg-purple-400"              },
                          { label: "Bajas",          value: writtenOff,   accent: "text-[var(--color-text-muted)]",             dot: "bg-[var(--color-border)]"   },
                        ].map(({ label, value, accent, dot }) => (
                          <div key={label}>
                            <div className="flex items-center gap-1 mb-0.5">
                              {dot && <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${dot}`} />}
                              <p className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wide truncate">{label}</p>
                            </div>
                            <p className={`text-base font-semibold ${accent}`}>{value}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Totals row */}
              {cuadreRows.length > 1 && (
                <Card className="border-[var(--color-border)] bg-[var(--color-accent-light)]/40 shadow-[var(--shadow-card)]">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-semibold text-[var(--color-text)]">Total general</p>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        cuadreTotals.discrepancy === 0
                          ? "bg-[var(--color-success)]/15 text-[var(--color-success)]"
                          : "bg-[var(--color-danger)]/15 text-[var(--color-danger)]"
                      }`}>
                        {cuadreTotals.discrepancy === 0
                          ? "✅ Cuadra"
                          : `⚠️ ${Math.abs(cuadreTotals.discrepancy)} ej. sin contabilizar`}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-x-4 gap-y-3">
                      {[
                        { label: "Impresos",       value: cuadreTotals.totalPrinted },
                        { label: "En mano",        value: cuadreTotals.inPersonal   },
                        { label: "En librerías",   value: cuadreTotals.inBookstores },
                        ...(cuadreTotals.inOther > 0 ? [{ label: "Otros inv.", value: cuadreTotals.inOther }] : []),
                        { label: "Vendidos",       value: cuadreTotals.sold         },
                        { label: "Canjes/Regalos", value: cuadreTotals.exchanged    },
                        { label: "Bajas",          value: cuadreTotals.writtenOff   },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wide mb-0.5">{label}</p>
                          <p className="text-base font-semibold text-[var(--color-text)]">{value}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
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
                <div className="hidden md:grid grid-cols-[minmax(0,1fr)_64px_130px_110px_110px] gap-4 px-5 py-2.5 border-b border-[var(--color-border)]">
                  {["Libro", "Tiradas", "Costo impresión", "Ingresos", "Resultado"].map((h, i) => (
                    <span key={h} className={`text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide ${i > 0 ? "text-right" : ""}`}>{h}</span>
                  ))}
                </div>
                <div className="divide-y divide-[var(--color-border)]">
                  {printBookPnl.map(row => {
                    const net = row.revenue - row.printCost;
                    return (
                      <div key={row.title} className="px-5 py-4">
                        <div className="flex md:grid md:grid-cols-[minmax(0,1fr)_64px_130px_110px_110px] items-center gap-3 md:gap-4">
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
                          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{row.pct.toFixed(0)}% recuperado</p>
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
                <div className="hidden md:grid grid-cols-[minmax(0,1fr)_80px_120px_110px_110px] gap-4 px-5 py-2.5 border-b border-[var(--color-border)]">
                  {["Producto", "Unidades", "Costo prod.", "Ingresos", "Resultado"].map((h, i) => (
                    <span key={h} className={`text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide ${i > 0 ? "text-right" : ""}`}>{h}</span>
                  ))}
                </div>
                <div className="divide-y divide-[var(--color-border)]">
                  {merchPnl.map(row => {
                    const net = row.revenue - row.cost;
                    return (
                      <div key={row.name} className="flex md:grid md:grid-cols-[minmax(0,1fr)_80px_120px_110px_110px] items-center gap-3 md:gap-4 px-5 py-3.5">
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
                  <span className={`text-lg font-semibold shrink-0 ${totalOutstanding > 0 ? "text-[var(--color-warning-text)]" : "text-[var(--color-success)]"}`}
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
                <div className="grid grid-cols-[minmax(0,1fr)_160px_120px_150px] gap-4 px-5 py-2.5 border-b border-[var(--color-border)]">
                  {["Mes", "Conservador (−20%)", "Realista", "Optimista (+20%)"].map((h, i) => (
                    <span key={h} className={`text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide ${i > 0 ? "text-right" : ""}`}>{h}</span>
                  ))}
                </div>
                <div className="divide-y divide-[var(--color-border)]">
                  {projectedMonths.map(m => (
                    <div key={m.month} className="grid grid-cols-[minmax(0,1fr)_160px_120px_150px] gap-4 px-5 py-3 items-center">
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
