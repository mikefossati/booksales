import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateAccount } from "@/lib/account";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, toNum } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import TabNav from "@/components/finanzas/TabNav";
import AddExpenseModal from "@/components/finanzas/AddExpenseModal";
import RecordPaymentModal from "@/components/finanzas/RecordPaymentModal";
import DeleteExpenseButton from "@/components/finanzas/DeleteExpenseButton";
import EditExpenseModal from "@/components/finanzas/EditExpenseModal";
import EditSaleModal from "@/components/sales/EditSaleModal";
import DeleteSaleButton from "@/components/sales/DeleteSaleButton";
import {
  TrendingUp, DollarSign, ShoppingBag, AlertCircle,
  CheckCircle2, BookOpen
} from "lucide-react";
import { calcOutstanding, saleToCLP } from "@/lib/finance";
import { CATEGORY_LABELS, LEVEL_LABELS, CHANNEL_TYPE_LABEL } from "@/lib/labels";

const PAYMENT_ICONS: Record<string, string> = {
  Efectivo: "💵", Transferencia: "📱", Tarjeta: "💳",
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function FinanzasPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: activeTab = "ingresos" } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const account = await getOrCreateAccount(user.id, user.email ?? "");
  const currency = account.baseCurrency;

  const channels = await prisma.channel.findMany({
    where: { accountId: account.id },
    select: { id: true, name: true, type: true, currency: true },
    orderBy: { name: "asc" },
  });
  const channelIds = channels.map(c => c.id);
  const channelMap = new Map(channels.map(c => [c.id, c]));

  const baseFilter = {
    channelId: { in: channelIds.length ? channelIds : ["__none__"] },
    status: { not: "CANCELLED" as const },
  };

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // ── Data for all tabs (fetched once) ─────────────────────────────────────

  const [
    allSales,
    allExpenses,
    allPayments,
    books,
    printRunsByBook,
  ] = await Promise.all([
    prisma.sale.findMany({
      where: baseFilter,
      include: {
        channel:     { select: { name: true, type: true } },
        merchandise: { select: { name: true } },
      },
      orderBy: { saleDate: "desc" },
    }),
    prisma.expense.findMany({
      where: { accountId: account.id },
      include: {
        book:     { select: { title: true } },
        printRun: { select: { quantity: true, receivedAt: true } },
      },
      orderBy: { occurredAt: "desc" },
    }),
    prisma.payment.findMany({
      where: { channelId: { in: channelIds.length ? channelIds : ["__none__"] } },
      select: { channelId: true, amount: true, currency: true, receivedAt: true, periodStart: true, periodEnd: true },
    }),
    prisma.book.findMany({
      where: { accountId: account.id },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
    prisma.printRun.findMany({
      where: { book: { accountId: account.id } },
      select: { id: true, bookId: true, quantity: true, receivedAt: true, totalCost: true },
      orderBy: { receivedAt: "desc" },
    }),
  ]);

  const booksWithRuns = books.map(b => ({
    ...b,
    printRuns: printRunsByBook.filter(r => r.bookId === b.id),
  }));

  // ── Computed totals ───────────────────────────────────────────────────────

  const totalRevenue      = allSales.reduce((s, sale) => s + saleToCLP(sale), 0);
  const totalExpenses     = allExpenses.reduce((s, e) => s + toNum(e.amount), 0);
  const totalPrintCosts   = printRunsByBook.reduce((s, r) => s + toNum(r.totalCost), 0);
  const monthlyRevenue    = allSales
    .filter(s => new Date(s.saleDate) >= monthStart)
    .reduce((s, sale) => s + saleToCLP(sale), 0);

  // "¿Qué me deben?" — per non-direct channel
  const payableChannels = channels.filter(c => c.type === "BOOKSTORE" || c.type === "DIGITAL");
  const payableData = payableChannels.map(ch => {
    const sales    = allSales.filter(s => s.channelId === ch.id).reduce((s, sale) => s + saleToCLP(sale), 0);
    const received = allPayments.filter(p => p.channelId === ch.id).reduce((s, p) => s + toNum(p.amount), 0);
    const outstanding = calcOutstanding(sales, received);
    return { channel: ch, totalSales: sales, totalReceived: received, outstanding };
  }).filter(d => d.totalSales > 0 || d.totalReceived > 0);

  const totalOutstanding = payableData.reduce((s, d) => s + d.outstanding, 0);

  // ── Rentabilidad: per book ────────────────────────────────────────────────

  const bookPnl = books.map(book => {
    const bookSales    = allSales.filter(s => s.bookId === book.id).reduce((s, sale) => s + saleToCLP(sale), 0);
    const bookExpenses = allExpenses.filter(e => e.bookId === book.id).reduce((s, e) => s + toNum(e.amount), 0);
    const bookPrintCosts = printRunsByBook.filter(r => r.bookId === book.id).reduce((s, r) => s + toNum(r.totalCost), 0);
    const netProfit = bookSales - bookExpenses - bookPrintCosts;
    return { book, bookSales, bookExpenses, bookPrintCosts, netProfit };
  }).filter(b => b.bookSales > 0 || b.bookExpenses > 0 || b.bookPrintCosts > 0);

  const generalExpenses = allExpenses.filter(e => e.level === "GENERAL").reduce((s, e) => s + toNum(e.amount), 0);
  const netProfitTotal  = totalRevenue - totalExpenses - totalPrintCosts;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="p-5 md:p-8 max-w-5xl">
      <header className="mb-7">
        <h1 className="text-2xl font-semibold text-[var(--color-text)]" style={{ fontFamily: "var(--font-heading)" }}>
          Finanzas
        </h1>
      </header>

      <Suspense>
        <TabNav />
      </Suspense>

      {/* ── INGRESOS ──────────────────────────────────────────────────────── */}
      {activeTab === "ingresos" && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Este mes",        value: formatCurrency(monthlyRevenue, currency),  icon: TrendingUp  },
              { label: "Total acumulado", value: formatCurrency(totalRevenue, currency),    icon: DollarSign  },
              { label: "Ventas",          value: String(allSales.length),                   icon: ShoppingBag },
            ].map(({ label, value, icon: Icon }) => (
              <Card key={label} className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
                <CardHeader className="flex flex-row items-start justify-between pb-1 space-y-0 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">{label}</CardTitle>
                  <Icon size={13} className="text-[var(--color-accent)] mt-0.5" />
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                  <p className="text-lg font-semibold text-[var(--color-text)]" style={{ fontFamily: "var(--font-heading)" }}>{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {allSales.length === 0 ? (
            <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
              <CardContent className="py-16 text-center">
                <p className="text-sm font-medium text-[var(--color-text)]">Sin ventas registradas</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">Usa el botón + para registrar tu primera venta</p>
              </CardContent>
            </Card>
          ) : (() => {
            // Group by month
            const grouped = new Map<string, typeof allSales>();
            for (const sale of allSales) {
              const key = new Date(sale.saleDate).toLocaleString("es-CL", { month: "long", year: "numeric" });
              if (!grouped.has(key)) grouped.set(key, []);
              grouped.get(key)!.push(sale);
            }
            return (
              <div className="space-y-6">
                {Array.from(grouped.entries()).map(([month, sales]) => {
                  const monthTotal = sales.reduce((s, r) => s + saleToCLP(r), 0);
                  return (
                    <section key={month}>
                      <div className="flex items-baseline justify-between mb-2">
                        <h2 className="text-sm font-semibold text-[var(--color-text)] capitalize" style={{ fontFamily: "var(--font-heading)" }}>{month}</h2>
                        <span className="text-sm font-semibold text-[var(--color-accent)]">{formatCurrency(monthTotal, currency)}</span>
                      </div>
                      <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
                        <div className="divide-y divide-[var(--color-border)]">
                          {sales.map(sale => (
                            <div key={sale.id} className="flex items-center gap-3 px-5 py-3.5">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[var(--color-text)] truncate">
                                  {sale.bookId
                                    ? books.find(b => b.id === sale.bookId)?.title ?? "Libro"
                                    : sale.merchandise?.name ?? "Merchandising"}
                                </p>
                                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                                  {sale.channel.name} · {formatDate(sale.saleDate)}
                                  {sale.paymentMethod && <span className="ml-1.5">{PAYMENT_ICONS[sale.paymentMethod] ?? ""} {sale.paymentMethod}</span>}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-semibold text-[var(--color-text)]">{formatCurrency(toNum(sale.totalAmount), sale.currency)}</p>
                                <p className="text-xs text-[var(--color-text-muted)]">{sale.quantity} × {formatCurrency(toNum(sale.unitPrice), sale.currency)}</p>
                              </div>
                              <Badge variant="secondary" className="text-[10px] px-2 py-0 bg-[var(--color-accent-light)] text-[var(--color-accent)] border-0 shrink-0">
                                {CHANNEL_TYPE_LABEL[sale.channel.type]}
                              </Badge>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <EditSaleModal sale={sale} channels={channels} />
                                <DeleteSaleButton id={sale.id} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    </section>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── GASTOS ────────────────────────────────────────────────────────── */}
      {activeTab === "gastos" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="grid grid-cols-2 gap-3 flex-1 mr-4">
              <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
                <CardContent className="p-4">
                  <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">Gastos registrados</p>
                  <p className="text-lg font-semibold text-[var(--color-text)] mt-0.5" style={{ fontFamily: "var(--font-heading)" }}>
                    {formatCurrency(totalExpenses, currency)}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
                <CardContent className="p-4">
                  <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">Costos de impresión</p>
                  <p className="text-lg font-semibold text-[var(--color-text)] mt-0.5" style={{ fontFamily: "var(--font-heading)" }}>
                    {formatCurrency(totalPrintCosts, currency)}
                  </p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">desde tiradas registradas</p>
                </CardContent>
              </Card>
            </div>
            <AddExpenseModal accountId={account.id} currency={currency} books={booksWithRuns} />
          </div>

          {allExpenses.length === 0 ? (
            <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
              <CardContent className="py-14 text-center">
                <p className="text-sm font-medium text-[var(--color-text)]">Sin gastos registrados</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">Diseño, edición, publicidad, ferias — todo suma a tu rentabilidad real.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
              <div className="divide-y divide-[var(--color-border)]">
                {allExpenses.map(exp => (
                  <div key={exp.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text)] truncate">{exp.description}</p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        {formatDate(exp.occurredAt)}
                        {exp.level !== "GENERAL" && exp.book && <span className="ml-1.5">· {exp.book.title}</span>}
                        {exp.notes && <span className="ml-1.5 italic">· {exp.notes}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[var(--color-text)]">{formatCurrency(toNum(exp.amount), exp.currency)}</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px] px-2 py-0 bg-[var(--color-accent-light)] text-[var(--color-accent)] border-0">
                        {CATEGORY_LABELS[exp.category]}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] px-2 py-0 border border-[var(--color-border)] bg-transparent text-[var(--color-text-muted)]">
                        {LEVEL_LABELS[exp.level]}
                      </Badge>
                      <EditExpenseModal
                        expense={{
                          id:          exp.id,
                          description: exp.description,
                          amount:      toNum(exp.amount),
                          currency:    exp.currency,
                          category:    exp.category,
                          level:       exp.level,
                          bookId:      exp.bookId,
                          printRunId:  exp.printRunId,
                          occurredAt:  exp.occurredAt,
                          notes:       exp.notes,
                        }}
                        books={booksWithRuns}
                      />
                      <DeleteExpenseButton id={exp.id} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── ¿QUÉ ME DEBEN? ───────────────────────────────────────────────── */}
      {activeTab === "deben" && (
        <div className="space-y-5">
          <div className="flex items-center gap-3 p-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
            {totalOutstanding > 0
              ? <AlertCircle size={18} className="text-[var(--color-warning)] shrink-0" />
              : <CheckCircle2 size={18} className="text-[var(--color-success)] shrink-0" />}
            <div>
              <p className="text-sm font-medium text-[var(--color-text)]">
                {totalOutstanding > 0
                  ? `${formatCurrency(totalOutstanding, currency)} pendientes de cobro`
                  : "¡Todo cobrado! — Al día con todos los canales"}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                {totalOutstanding > 0
                  ? "Librerías y plataformas digitales que aún no han pagado"
                  : "No tienes cobros pendientes en este momento"}
              </p>
            </div>
          </div>

          {payableData.length === 0 ? (
            <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
              <CardContent className="py-14 text-center">
                <p className="text-sm font-medium text-[var(--color-text)]">Sin canales de cobro configurados</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">Agrega librerías o canales digitales en Configuración</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
              <div className="hidden md:grid grid-cols-[minmax(0,1fr)_110px_110px_110px_90px] gap-4 px-5 py-2.5 border-b border-[var(--color-border)]">
                {["Canal", "Vendido", "Cobrado", "Pendiente", ""].map(h => (
                  <span key={h} className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide text-right first:text-left">{h}</span>
                ))}
              </div>
              {payableData.map(({ channel, totalSales, totalReceived, outstanding }) => (
                <div key={channel.id} className="flex md:grid md:grid-cols-[minmax(0,1fr)_110px_110px_110px_90px] items-center gap-3 md:gap-4 px-5 py-4 border-b border-[var(--color-border)] last:border-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--color-text)]">{channel.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{CHANNEL_TYPE_LABEL[channel.type]}</p>
                  </div>
                  <span className="hidden md:block text-sm text-[var(--color-text-muted)] text-right">{formatCurrency(totalSales, currency)}</span>
                  <span className="hidden md:block text-sm text-[var(--color-success)] text-right">{formatCurrency(totalReceived, currency)}</span>
                  <span className={`text-sm font-semibold text-right ${outstanding > 0 ? "text-[var(--color-warning)]" : "text-[var(--color-success)]"}`}>
                    {outstanding > 0 ? formatCurrency(outstanding, currency) : "✓"}
                  </span>
                  {outstanding > 0 ? (
                    <RecordPaymentModal
                      channelId={channel.id}
                      channelName={channel.name}
                      outstandingAmount={outstanding}
                      currency={channel.currency ?? currency}
                    />
                  ) : (
                    <span className="text-xs text-[var(--color-text-muted)]">Al día</span>
                  )}
                </div>
              ))}
            </Card>
          )}
        </div>
      )}

      {/* ── RENTABILIDAD ─────────────────────────────────────────────────── */}
      {activeTab === "rentabilidad" && (
        <div className="space-y-5">
          {/* Overall P&L */}
          <Card className={`border shadow-[var(--shadow-card)] ${netProfitTotal >= 0 ? "bg-[var(--color-success)]/6 border-[var(--color-success)]/20" : "bg-[var(--color-surface)] border-[var(--color-border)]"}`}>
            <CardContent className="p-5">
              <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-3">Resultado general</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Ingresos",           value: formatCurrency(totalRevenue, currency),    color: "text-[var(--color-accent)]"  },
                  { label: "Gastos directos",    value: formatCurrency(totalExpenses, currency),   color: "text-[var(--color-danger)]"  },
                  { label: "Costos impresión",   value: formatCurrency(totalPrintCosts, currency), color: "text-[var(--color-danger)]"  },
                  { label: "Resultado neto",     value: formatCurrency(netProfitTotal, currency),  color: netProfitTotal >= 0 ? "text-[var(--color-success)]" : "text-[var(--color-danger)]" },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
                    <p className={`text-lg font-semibold mt-0.5 ${color}`} style={{ fontFamily: "var(--font-heading)" }}>{value}</p>
                  </div>
                ))}
              </div>
              {generalExpenses > 0 && (
                <p className="text-xs text-[var(--color-text-muted)] mt-3 pt-3 border-t border-[var(--color-border)]">
                  * Incluye {formatCurrency(generalExpenses, currency)} en gastos generales no asignados a ningún libro
                </p>
              )}
            </CardContent>
          </Card>

          {/* Per-book P&L */}
          {bookPnl.length === 0 ? (
            <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
              <CardContent className="py-14 text-center">
                <p className="text-sm font-medium text-[var(--color-text)]">Sin datos suficientes</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">Registra ventas y gastos para ver la rentabilidad por libro</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-[var(--color-text)]" style={{ fontFamily: "var(--font-heading)" }}>Por libro</h2>
              {bookPnl.map(({ book, bookSales, bookExpenses, bookPrintCosts, netProfit }) => {
                const totalCost = bookExpenses + bookPrintCosts;
                const recovered = totalCost > 0 ? Math.min((bookSales / totalCost) * 100, 100) : 100;
                return (
                  <Card key={book.id} className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <BookOpen size={14} className="text-[var(--color-accent)] mt-0.5" />
                          <p className="text-sm font-semibold text-[var(--color-text)]">{book.title}</p>
                        </div>
                        <span className={`text-sm font-semibold ${netProfit >= 0 ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>
                          {netProfit >= 0 ? "+" : ""}{formatCurrency(netProfit, currency)}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                        <div>
                          <p className="text-[var(--color-text-muted)]">Ingresos</p>
                          <p className="font-medium text-[var(--color-text)]">{formatCurrency(bookSales, currency)}</p>
                        </div>
                        <div>
                          <p className="text-[var(--color-text-muted)]">Gastos directos</p>
                          <p className="font-medium text-[var(--color-text)]">{formatCurrency(bookExpenses, currency)}</p>
                        </div>
                        <div>
                          <p className="text-[var(--color-text-muted)]">Tiradas</p>
                          <p className="font-medium text-[var(--color-text)]">{formatCurrency(bookPrintCosts, currency)}</p>
                        </div>
                      </div>
                      {totalCost > 0 && (
                        <>
                          <div className="h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${recovered >= 100 ? "bg-[var(--color-success)]" : "bg-[var(--color-accent)]"}`}
                              style={{ width: `${recovered}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
                            {recovered.toFixed(0)}% de la inversión recuperada
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
