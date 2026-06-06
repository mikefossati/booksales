import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateAccount } from "@/lib/account";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, toNum } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, ArrowLeft, Package } from "lucide-react";
import AddPrintRunModal from "@/components/libros/AddPrintRunModal";
import SendToBookstoreModal from "@/components/libros/SendToBookstoreModal";
import EditBookModal from "@/components/libros/EditBookModal";
import DeleteBookButton from "@/components/libros/DeleteBookButton";
import EditSaleModal from "@/components/sales/EditSaleModal";
import DeleteSaleButton from "@/components/sales/DeleteSaleButton";
import EditPrintRunModal from "@/components/libros/EditPrintRunModal";
import WriteoffModal from "@/components/libros/WriteoffModal";
import BookTabNav from "@/components/libros/BookTabNav";
import {
  STOCK_SIGN,
  calcStockInHand,
  calcInBookstores,
  calcInExchanges,
  calcRecoveryPct,
  isFullyRecovered,
} from "@/lib/finance";

// ── Labels ────────────────────────────────────────────────────────────────────

const FORMAT_LABELS: Record<string, string> = {
  EBOOK: "Ebook", PRINT: "Impreso", AUDIOBOOK: "Audiolibro",
};

const PAYMENT_ICONS: Record<string, string> = {
  Efectivo: "💵", Transferencia: "📱", Tarjeta: "💳",
};

const MOVEMENT_LABELS: Record<string, string> = {
  NEW_PRINT_RUN:      "Nueva tirada",
  SEND_TO_BOOKSTORE:  "Enviado a librería",
  DIRECT_SALE:        "Venta directa",
  BOOKSTORE_RETURN:   "Devolución de librería",
  SEND_TO_INFLUENCER: "Enviado a influencer",
  WRITEOFF:           "Baja de inventario",
  BUNDLE_ASSEMBLY:    "Ensamblaje de bundle",
};

const MOVEMENT_ICON: Record<string, string> = {
  NEW_PRINT_RUN:      "📦",
  SEND_TO_BOOKSTORE:  "🏪",
  DIRECT_SALE:        "💵",
  BOOKSTORE_RETURN:   "↩️",
  SEND_TO_INFLUENCER: "🤝",
  WRITEOFF:           "🗑️",
  BUNDLE_ASSEMBLY:    "📦",
};

// MOVEMENT_SIGN alias — imported as STOCK_SIGN from @/lib/finance
const MOVEMENT_SIGN = STOCK_SIGN;

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function BookDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id }              = await params;
  const { tab = "resumen" } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const account  = await getOrCreateAccount(user.id, user.email ?? "");
  const currency = account.baseCurrency;

  const book = await prisma.book.findFirst({ where: { id, accountId: account.id } });
  if (!book) notFound();

  const isPrint = book.formats.includes("PRINT");

  const [salesStats, allSales, printRuns, movements, bookstoreChannels, allChannels] =
    await Promise.all([
      prisma.sale.aggregate({
        where: { bookId: book.id, status: { not: "CANCELLED" } },
        _sum:  { amountCLP: true, quantity: true },
      }),
      prisma.sale.findMany({
        where:   { bookId: book.id, status: { not: "CANCELLED" } },
        include: { channel: { select: { name: true, type: true } } },
        orderBy: { saleDate: "desc" },
      }),
      isPrint
        ? prisma.printRun.findMany({
            where:   { bookId: book.id },
            orderBy: { receivedAt: "desc" },
          })
        : Promise.resolve([]),
      isPrint
        ? prisma.inventoryMovement.findMany({
            where:   { bookId: book.id },
            select:  { id: true, type: true, quantity: true, channelId: true, occurredAt: true, notes: true },
            orderBy: { occurredAt: "desc" },
          })
        : Promise.resolve([]),
      prisma.channel.findMany({
        where:   { accountId: account.id, type: "BOOKSTORE" },
        select:  { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.channel.findMany({
        where:   { accountId: account.id },
        select:  { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

  // ── Derived stock values ──────────────────────────────────────────────────────

  const totalUnits   = salesStats._sum.quantity ?? 0;
  const totalRevenue = toNum(salesStats._sum.amountCLP);

  const stockInHand  = calcStockInHand(movements);
  const inBookstores = calcInBookstores(movements);
  const inExchanges  = calcInExchanges(movements);

  const totalPrintCost = printRuns.reduce((s, r) => s + toNum(r.totalCost), 0);
  const totalPrinted   = printRuns.reduce((s, r) => s + r.quantity, 0);
  const recoveryPct    = calcRecoveryPct(totalRevenue, totalPrintCost);
  const recovered      = isFullyRecovered(totalRevenue, totalPrintCost);

  const channelLookup = new Map(allChannels.map(c => [c.id, c.name]));

  // ── Shared header (always visible) ───────────────────────────────────────────

  return (
    <main className="p-5 md:p-8 max-w-4xl">
      <Link
        href="/libros"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Mis Libros
      </Link>

      {/* Book header */}
      <header className="flex items-start gap-5 mb-6">
        <div className="w-20 h-28 rounded-[var(--radius-md)] bg-[var(--color-accent-light)] flex items-center justify-center shrink-0 overflow-hidden">
          {book.coverUrl
            ? <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
            : <BookOpen size={24} className="text-[var(--color-accent)] opacity-50" />}
        </div>
        <div className="flex-1 min-w-0">
          <h1
            className="text-2xl font-semibold text-[var(--color-text)] leading-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {book.title}
          </h1>
          {book.subtitle && (
            <p className="text-sm text-[var(--color-text-muted)] mt-1">{book.subtitle}</p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {book.formats.map(f => (
              <Badge key={f} variant="secondary" className="text-xs bg-[var(--color-accent-light)] text-[var(--color-accent)] border-0">
                {FORMAT_LABELS[f] ?? f}
              </Badge>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <EditBookModal book={book} />
            <DeleteBookButton id={book.id} />
          </div>
        </div>
      </header>

      {/* Stats strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        {[
          { label: "Ventas totales", value: `${totalUnits} unidades` },
          { label: "Ingresos",       value: formatCurrency(totalRevenue, currency) },
          { label: "Stock en mano",  value: isPrint ? `${Math.max(0, stockInHand)} ej.`  : "—" },
          { label: "En librerías",   value: isPrint ? `${Math.max(0, inBookstores)} ej.` : "—" },
        ].map(({ label, value }) => (
          <Card key={label} className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-4 pb-4">
              <p className="text-xl font-semibold text-[var(--color-text)]" style={{ fontFamily: "var(--font-heading)" }}>
                {value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tab navigation */}
      <Suspense>
        <BookTabNav bookId={book.id} isPrint={isPrint} />
      </Suspense>

      {/* ── RESUMEN ────────────────────────────────────────────────────────── */}
      {tab === "resumen" && (
        <div className="space-y-5">
          {/* Recovery bar (PRINT only) */}
          {isPrint && totalPrintCost > 0 && (
            <Card className={`border shadow-[var(--shadow-card)] ${recovered ? "bg-[var(--color-success)]/8 border-[var(--color-success)]/20" : "bg-[var(--color-surface)] border-[var(--color-border)]"}`}>
              <CardContent className="px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-[var(--color-text)]">
                    {recovered ? "✅ Inversión recuperada" : "Recuperación de inversión"}
                  </p>
                  <span className="text-sm font-semibold text-[var(--color-text)]">
                    {recoveryPct.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[var(--color-border)] overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all ${recovered ? "bg-[var(--color-success)]" : "bg-[var(--color-accent)]"}`}
                    style={{ width: `${recoveryPct}%` }}
                  />
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mt-2">
                  {formatCurrency(Math.min(totalRevenue, totalPrintCost), currency)} de{" "}
                  {formatCurrency(totalPrintCost, currency)} en costos de impresión
                </p>
              </CardContent>
            </Card>
          )}

          {/* Last 5 sales preview */}
          <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-[var(--color-text)]" style={{ fontFamily: "var(--font-heading)" }}>
                Últimas ventas
              </CardTitle>
              {allSales.length > 5 && (
                <Link
                  href={`/libros/${book.id}?tab=ventas`}
                  className="text-xs font-medium text-[var(--color-accent)] hover:underline"
                >
                  Ver todas ({allSales.length}) →
                </Link>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {allSales.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)] py-8 text-center px-5">
                  Sin ventas registradas
                </p>
              ) : (
                <div className="divide-y divide-[var(--color-border)]">
                  {allSales.slice(0, 5).map(sale => (
                    <div key={sale.id} className="flex items-center gap-4 px-5 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--color-text)]">{sale.channel.name}</p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                          {formatDate(sale.saleDate)} · {sale.quantity} ej.
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-[var(--color-text)] shrink-0">
                        {formatCurrency(toNum(sale.totalAmount), sale.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── VENTAS ────────────────────────────────────────────────────────── */}
      {tab === "ventas" && (
        <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-[var(--color-text)]" style={{ fontFamily: "var(--font-heading)" }}>
              Historial de ventas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {allSales.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] py-8 text-center">
                Sin ventas registradas
              </p>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-2">
                  {["Canal", "Fecha", "Cant.", "Precio unit.", "Total", ""].map(h => (
                    <span key={h} className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide text-right first:text-left">
                      {h}
                    </span>
                  ))}
                </div>
                {allSales.map(sale => (
                  <div key={sale.id} className="grid grid-cols-[1fr_auto_auto] md:grid-cols-[1fr_auto_auto_auto_auto_auto] gap-2 md:gap-4 px-5 py-3.5 items-center">
                    <div>
                      <p className="text-sm text-[var(--color-text)]">{sale.channel.name}</p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        {formatDate(sale.saleDate)}
                        {sale.paymentMethod && <span className="ml-1.5">{PAYMENT_ICONS[sale.paymentMethod] ?? ""} {sale.paymentMethod}</span>}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-[var(--color-text)] md:hidden">
                      {formatCurrency(toNum(sale.totalAmount), sale.currency)}
                    </span>
                    <span className="hidden md:block text-sm text-[var(--color-text-muted)] text-right">{formatDate(sale.saleDate)}</span>
                    <span className="hidden md:block text-sm text-[var(--color-text)] text-right">{sale.quantity}</span>
                    <span className="hidden md:block text-sm text-[var(--color-text-muted)] text-right">{formatCurrency(toNum(sale.unitPrice), sale.currency)}</span>
                    <span className="hidden md:block text-sm font-semibold text-[var(--color-text)] text-right">
                      {formatCurrency(toNum(sale.totalAmount), sale.currency)}
                      {sale.currency !== currency && sale.amountCLP && (
                        <span className="block text-[10px] font-normal text-[var(--color-text-muted)]">
                          ≈ {formatCurrency(toNum(sale.amountCLP), currency)}
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2 justify-end">
                      <EditSaleModal sale={sale} channels={allChannels} />
                      <DeleteSaleButton id={sale.id} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── TIRADAS ───────────────────────────────────────────────────────── */}
      {tab === "tiradas" && isPrint && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--color-text-muted)]">
              Total impreso: <strong className="text-[var(--color-text)]">{totalPrinted}</strong>
              {" · "}En mano: <strong className="text-[var(--color-text)]">{Math.max(0, stockInHand)}</strong>
              {" · "}En librerías: <strong className="text-[var(--color-text)]">{Math.max(0, inBookstores)}</strong>
            </p>
            <AddPrintRunModal bookId={book.id} />
          </div>

          {printRuns.length === 0 ? (
            <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
              <CardContent className="p-5">
                <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-[var(--color-accent-light)] flex items-center justify-center text-[var(--color-accent)]">
                    <Package size={16} />
                  </div>
                  <p className="text-sm font-medium text-[var(--color-text)]">Sin tiradas registradas</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Registra cuántos ejemplares imprimiste y cuánto costó</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {totalPrintCost > 0 && (
                <Card className={`border shadow-[var(--shadow-card)] ${recovered ? "bg-[var(--color-success)]/8 border-[var(--color-success)]/20" : "bg-[var(--color-surface)] border-[var(--color-border)]"}`}>
                  <CardContent className="px-5 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-[var(--color-text)]">
                        {recovered ? "✅ Inversión recuperada" : "Recuperación de inversión"}
                      </p>
                      <span className="text-sm font-semibold text-[var(--color-text)]">{recoveryPct.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--color-border)] overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all ${recovered ? "bg-[var(--color-success)]" : "bg-[var(--color-accent)]"}`}
                        style={{ width: `${recoveryPct}%` }}
                      />
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-2">
                      {formatCurrency(Math.min(totalRevenue, totalPrintCost), currency)} de {formatCurrency(totalPrintCost, currency)} en costos de impresión
                    </p>
                  </CardContent>
                </Card>
              )}

              {printRuns.map((run, i) => {
                const costPerUnit = toNum(run.costPerUnit);
                return (
                  <Card key={run.id} className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
                    <CardContent className="px-5 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[var(--color-text)]">
                            Tirada #{printRuns.length - i} — {run.quantity.toLocaleString("es-CL")} ejemplares
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                            Recibida: {formatDate(run.receivedAt)}
                            {run.supplier && <span className="ml-1.5">· {run.supplier}</span>}
                          </p>
                          {run.notes && <p className="text-xs text-[var(--color-text-muted)] mt-0.5 italic">{run.notes}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <p className="text-sm font-semibold text-[var(--color-text)]">
                              {formatCurrency(toNum(run.totalCost), currency)}
                            </p>
                            <p className="text-xs text-[var(--color-text-muted)]">
                              {formatCurrency(costPerUnit, currency)}/ej.
                            </p>
                          </div>
                          <EditPrintRunModal
                            run={{
                              id:         run.id,
                              quantity:   run.quantity,
                              totalCost:  toNum(run.totalCost),
                              supplier:   run.supplier,
                              receivedAt: run.receivedAt,
                              notes:      run.notes,
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* ── INVENTARIO ────────────────────────────────────────────────────── */}
      {tab === "inventario" && isPrint && (
        <div className="space-y-5">
          {/* Summary + actions */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-5 text-sm text-[var(--color-text-muted)]">
              <span>En mano: <strong className="text-[var(--color-text)]">{Math.max(0, stockInHand)}</strong></span>
              <span>En librerías: <strong className="text-[var(--color-text)]">{Math.max(0, inBookstores)}</strong></span>
              <span>En canje: <strong className="text-[var(--color-text)]">{inExchanges}</strong></span>
            </div>
            <div className="flex gap-2">
              {stockInHand > 0 && (
                <SendToBookstoreModal
                  bookId={book.id}
                  bookstoreChannels={bookstoreChannels}
                  maxQty={stockInHand}
                />
              )}
              {stockInHand > 0 && (
                <WriteoffModal bookId={book.id} maxQty={stockInHand} />
              )}
            </div>
          </div>

          {/* Movements list */}
          <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-[var(--color-text)]" style={{ fontFamily: "var(--font-heading)" }}>
                Historial de movimientos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {movements.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-[var(--color-text-muted)]">Sin movimientos registrados</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--color-border)]">
                  {movements.map(m => {
                    const sign    = MOVEMENT_SIGN[m.type] ?? 0;
                    const signStr = sign > 0 ? "+" : "−";
                    const color   = sign > 0 ? "text-[var(--color-success)]" : "text-[var(--color-danger)]";
                    const chName  = m.channelId ? channelLookup.get(m.channelId) : null;
                    return (
                      <div key={m.id} className="flex items-center gap-3 px-5 py-3.5">
                        <span className="text-base shrink-0">{MOVEMENT_ICON[m.type] ?? "•"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[var(--color-text)]">
                            {MOVEMENT_LABELS[m.type] ?? m.type}
                            {chName && <span className="text-[var(--color-text-muted)]"> — {chName}</span>}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                            {formatDate(m.occurredAt)}
                            {m.notes && <span className="ml-1.5 italic">· {m.notes}</span>}
                          </p>
                        </div>
                        <span className={`text-sm font-semibold shrink-0 ${color}`}>
                          {signStr} {m.quantity} ej.
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
