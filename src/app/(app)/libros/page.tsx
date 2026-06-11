import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateAccount } from "@/lib/account";
import { prisma } from "@/lib/prisma";
import { formatDate, formatCurrency, toNum } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BookCard from "@/components/libros/BookCard";
import AddBookModal from "@/components/libros/AddBookModal";
import LibrosTabNav from "@/components/libros/LibrosTabNav";
import AddExchangeModal from "@/components/libros/AddExchangeModal";
import EditExchangeModal from "@/components/libros/EditExchangeModal";
import DeleteExchangeButton from "@/components/libros/DeleteExchangeButton";
import AddMerchModal from "@/components/libros/AddMerchModal";
import EditMerchModal from "@/components/libros/EditMerchModal";
import DeleteMerchButton from "@/components/libros/DeleteMerchButton";
import AddBatchModal from "@/components/libros/AddBatchModal";
import { BookOpen, Handshake, ShoppingBag } from "lucide-react";
import type { ExchangeStatus, MerchandiseType } from "@/generated/prisma/client";
import { getExchangeStatusMeta, calcMerchStock } from "@/lib/finance";

const getStatusMeta = getExchangeStatusMeta;

const TYPE_LABELS: Record<MerchandiseType, string> = { SIMPLE: "Simple", BUNDLE: "Bundle" };

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function LibrosPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "libros" } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const account  = await getOrCreateAccount(user.id, user.email ?? "");
  const currency = account.baseCurrency;

  const [books, exchanges, merchandise] = await Promise.all([
    prisma.book.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: "desc" },
    }),
    tab === "canjes"
      ? prisma.exchange.findMany({
          where:   { book: { accountId: account.id } },
          include: { book: { select: { title: true } } },
          orderBy: { sentAt: "desc" },
        })
      : Promise.resolve([] as {
          id: string; recipient: string; quantity: number;
          sentAt: Date; deadlineAt: Date | null;
          expectedResult: string | null; evidenceUrl: string | null;
          notes: string | null; status: ExchangeStatus;
          book: { title: string };
        }[]),
    tab === "merchandising"
      ? prisma.merchandise.findMany({
          where:   { accountId: account.id },
          include: {
            productionBatches: {
              select: { id: true, quantity: true, totalCost: true, costPerUnit: true, supplier: true, receivedAt: true },
              orderBy: { receivedAt: "desc" },
            },
            sales: {
              where:  { status: { not: "CANCELLED" } },
              select: { quantity: true },
            },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([] as {
          id: string; name: string; type: MerchandiseType;
          suggestedPrice: unknown; category: string | null;
          bookId: string | null; edition: string | null;
          components: unknown; sku: string | null;
          description: string | null; isActive: boolean;
          productionBatches: { id: string; quantity: number; totalCost: unknown; costPerUnit: unknown; supplier: string | null; receivedAt: Date }[];
          sales: { quantity: number }[];
        }[]),
  ]);

  const bookOptions = books.map(b => ({ id: b.id, title: b.title }));

  const nCanjes  = exchanges.filter(e => e.expectedResult !== null).length;
  const nRegalos = exchanges.filter(e => e.expectedResult === null).length;
  const exchangeSubtitle = exchanges.length === 0
    ? "Sin salidas registradas"
    : [nCanjes  > 0 ? `${nCanjes} ${nCanjes  === 1 ? "canje"  : "canjes"}`  : null,
       nRegalos > 0 ? `${nRegalos} ${nRegalos === 1 ? "regalo" : "regalos"}` : null]
        .filter(Boolean).join(" · ");

  const subtitle = tab === "libros"
    ? books.length === 0 ? "Aún no tienes libros" : `${books.length} ${books.length === 1 ? "libro" : "libros"}`
    : tab === "merchandising"
    ? `${merchandise.length} ${merchandise.length === 1 ? "producto" : "productos"}`
    : exchangeSubtitle;

  return (
    <main className="p-5 md:p-8 max-w-6xl">
      <header className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text)] font-heading">
            Mis Libros
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{subtitle}</p>
        </div>
        {tab === "libros"        && <AddBookModal accountId={account.id} />}
        {tab === "merchandising" && <AddMerchModal accountId={account.id} books={bookOptions} />}
        {tab === "canjes"        && <AddExchangeModal accountId={account.id} books={bookOptions} />}
      </header>

      <Suspense>
        <LibrosTabNav />
      </Suspense>

      {/* ── LIBROS ──────────────────────────────────────────────────────── */}
      {tab === "libros" && (
        books.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[var(--color-accent-light)] flex items-center justify-center text-[var(--color-accent)]">
              <BookOpen size={28} />
            </div>
            <div>
              <p className="text-base font-medium text-[var(--color-text)]">Agrega tu primer libro</p>
              <p className="text-sm text-[var(--color-text-muted)] mt-1 max-w-xs">
                Una vez que agregues un libro, podrás registrar tiradas, ventas e inventario.
              </p>
            </div>
            <AddBookModal accountId={account.id} />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {books.map(book => <BookCard key={book.id} book={book} />)}
          </div>
        )
      )}

      {/* ── MERCHANDISING ───────────────────────────────────────────────── */}
      {tab === "merchandising" && (
        merchandise.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[var(--color-accent-light)] flex items-center justify-center text-[var(--color-accent)]">
              <ShoppingBag size={28} />
            </div>
            <div>
              <p className="text-base font-medium text-[var(--color-text)]">Aún no tienes productos</p>
              <p className="text-sm text-[var(--color-text-muted)] mt-1 max-w-xs">
                Agrega remeras, tote bags, stickers, sets o cualquier producto de tu marca.
              </p>
            </div>
            <AddMerchModal accountId={account.id} books={bookOptions} />
          </div>
        ) : (
          <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
            <div className="hidden md:grid grid-cols-[minmax(0,1fr)_56px_72px_100px_28px_28px] gap-4 px-5 py-2.5 border-b border-[var(--color-border)]">
              {["Producto", "Lotes", "Stock", "Precio", "", ""].map((h, i) => (
                <span key={i} className={`text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide ${i > 0 ? "text-right" : ""}`}>
                  {h}
                </span>
              ))}
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {merchandise.map(item => {
                const totalBatched = item.productionBatches.reduce((s, b) => s + b.quantity, 0);
                const totalSold    = item.sales.reduce((acc, sale) => acc + sale.quantity, 0);
                const stock        = calcMerchStock(totalBatched, totalSold);
                const lastBatch    = item.productionBatches[0];
                const stockColor   = stock <= 0 ? "text-[var(--color-danger)]" : stock <= 5 ? "text-[var(--color-warning-text)]" : "text-[var(--color-text)]";

                return (
                  <div key={item.id} className={`px-5 py-4 ${!item.isActive ? "opacity-50" : ""}`}>
                    <div className="flex md:grid md:grid-cols-[minmax(0,1fr)_56px_72px_100px_28px_28px] items-start gap-3 md:gap-4">
                      {/* Name + badges */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-[var(--color-text)]">{item.name}</p>
                          <Badge variant="secondary" className="text-[11px] px-2 py-0 bg-[var(--color-accent-light)] text-[var(--color-accent)] border-0">
                            {TYPE_LABELS[item.type]}
                          </Badge>
                          {item.category && (
                            <Badge variant="secondary" className="text-[11px] px-2 py-0 border border-[var(--color-border)] bg-transparent text-[var(--color-text-muted)]">
                              {item.category}
                            </Badge>
                          )}
                          {!item.isActive && (
                            <Badge variant="secondary" className="text-[11px] px-2 py-0 bg-[var(--color-border)] text-[var(--color-text-muted)] border-0">
                              Descontinuado
                            </Badge>
                          )}
                        </div>
                        {lastBatch && (
                          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                            Último lote: {formatDate(lastBatch.receivedAt)}
                            {lastBatch.supplier && ` · ${lastBatch.supplier}`}
                          </p>
                        )}
                        {/* Mobile stats */}
                        <p className={`md:hidden text-xs font-medium mt-1 ${stockColor}`}>
                          Stock: {stock} ej.
                        </p>
                      </div>

                      {/* Lotes count */}
                      <span className="hidden md:block text-sm text-[var(--color-text-muted)] text-right mt-0.5">
                        {item.productionBatches.length}
                      </span>

                      {/* Stock */}
                      <span className={`hidden md:block text-sm font-medium text-right mt-0.5 ${stockColor}`}>
                        {stock}
                      </span>

                      {/* Price */}
                      <span className="hidden md:block text-sm text-[var(--color-text-muted)] text-right mt-0.5 whitespace-nowrap">
                        {item.suggestedPrice ? formatCurrency(toNum(item.suggestedPrice), currency) : "—"}
                      </span>

                      {/* Add batch */}
                      <div className="hidden md:flex justify-end mt-0.5">
                        <AddBatchModal merchandiseId={item.id} productName={item.name} />
                      </div>

                      {/* Edit / Delete */}
                      <div className="flex items-center gap-1 shrink-0 mt-0.5">
                        <EditMerchModal
                          merch={{
                            id:             item.id,
                            name:           item.name,
                            type:           item.type,
                            suggestedPrice: item.suggestedPrice ? toNum(item.suggestedPrice) : null,
                            category:       item.category,
                            bookId:         item.bookId,
                            edition:        item.edition,
                            components:     item.components as string[] | null,
                            sku:            item.sku,
                            description:    item.description,
                            isActive:       item.isActive,
                          }}
                          books={bookOptions}
                        />
                        <DeleteMerchButton id={item.id} name={item.name} />
                      </div>
                    </div>

                    {/* Mobile-only batch button */}
                    <div className="md:hidden mt-2">
                      <AddBatchModal merchandiseId={item.id} productName={item.name} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )
      )}

      {/* ── CANJES / REGALOS ────────────────────────────────────────────── */}
      {tab === "canjes" && (
        exchanges.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[var(--color-accent-light)] flex items-center justify-center text-[var(--color-accent)]">
              <Handshake size={28} />
            </div>
            <div>
              <p className="text-base font-medium text-[var(--color-text)]">Sin salidas sin venta registradas</p>
              <p className="text-sm text-[var(--color-text-muted)] mt-1 max-w-xs">
                Registra regalos y canjes con influencers o colaboradores. Descontarán del inventario sin generar una venta.
              </p>
            </div>
            <AddExchangeModal accountId={account.id} books={bookOptions} />
          </div>
        ) : (
          <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
            <div className="hidden md:grid grid-cols-[24px_minmax(0,1fr)_48px_90px_90px_56px] gap-4 px-5 py-2.5 border-b border-[var(--color-border)]">
              {["", "Destinatario / Libro", "Ej.", "Enviado", "Límite", ""].map((h, i) => (
                <span key={i} className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">{h}</span>
              ))}
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {exchanges.map(ex => {
                const isGift = ex.expectedResult === null;
                const { dot, label, labelColor } = getStatusMeta(ex.status, ex.deadlineAt);
                const isOverdue = !isGift && ex.status === "PENDING" && ex.deadlineAt !== null && new Date(ex.deadlineAt) < new Date();
                return (
                  <div key={ex.id} className="flex md:grid md:grid-cols-[24px_minmax(0,1fr)_48px_90px_90px_56px] items-start gap-3 md:gap-4 px-5 py-4">
                    <span className="text-base mt-0.5" aria-hidden="true">{isGift ? "🎁" : dot}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-[var(--color-text)]">{ex.recipient}</p>
                        <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${isGift ? "bg-[var(--color-accent-light)] text-[var(--color-accent)]" : "bg-[var(--color-border)] text-[var(--color-text-muted)]"}`}>
                          {isGift ? "Regalo" : "Canje"}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{ex.book.title}</p>
                      {ex.expectedResult && <p className="text-xs text-[var(--color-text-muted)] mt-0.5 italic">"{ex.expectedResult}"</p>}
                      {ex.evidenceUrl && (
                        <a href={ex.evidenceUrl} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-[var(--color-accent)] hover:underline mt-0.5 block truncate">
                          Ver evidencia →
                        </a>
                      )}
                      {!isGift && <span className={`md:hidden text-xs font-medium mt-1 block ${labelColor}`}>{label}</span>}
                    </div>
                    <span className="hidden md:block text-sm text-[var(--color-text)] text-right mt-0.5">{ex.quantity}</span>
                    <span className="hidden md:block text-xs text-[var(--color-text-muted)] text-right mt-0.5 whitespace-nowrap">{formatDate(ex.sentAt)}</span>
                    <span className={`hidden md:block text-xs text-right mt-0.5 whitespace-nowrap ${isOverdue ? "text-[var(--color-danger)] font-medium" : "text-[var(--color-text-muted)]"}`}>
                      {isGift ? "—" : ex.deadlineAt ? formatDate(ex.deadlineAt) : "—"}{isOverdue && " ⚠️"}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <EditExchangeModal exchange={{ id: ex.id, recipient: ex.recipient, expectedResult: ex.expectedResult, deadlineAt: ex.deadlineAt, status: ex.status, evidenceUrl: ex.evidenceUrl, notes: ex.notes }} />
                      <DeleteExchangeButton id={ex.id} recipient={ex.recipient} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )
      )}
    </main>
  );
}
