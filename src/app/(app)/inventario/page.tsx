import { createClient } from "@/lib/supabase/server";
import { getOrCreateAccount } from "@/lib/account";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddInventoryModal, EditInventoryButton, DeleteInventoryButton } from "@/components/configuracion/InventoryModals";
import { TransferStockModal, AdjustStockModal } from "@/components/configuracion/StockActionModals";
import { calcStockMatrix } from "@/lib/finance";
import { Package, Home, Store, Layers } from "lucide-react";

export default async function InventarioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const account = await getOrCreateAccount(user.id, user.email ?? "");

  const [inventories, books, bookMovements] = await Promise.all([
    prisma.inventory.findMany({
      where:   { accountId: account.id },
      select:  { id: true, name: true, isDefault: true, channels: { select: { id: true, name: true, type: true } } },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    }),
    prisma.book.findMany({
      where:   { accountId: account.id, formats: { has: "PRINT" } },
      select:  { id: true, title: true },
      orderBy: { title: "asc" },
    }),
    prisma.inventoryMovement.findMany({
      where:  { bookId: { not: null }, book: { accountId: account.id } },
      select: { bookId: true, inventoryId: true, type: true, quantity: true },
    }),
  ]);

  const stockMatrix      = calcStockMatrix(bookMovements);
  const bookOptions      = books.map(b => ({ id: b.id, name: b.title }));
  const inventoryOptions = inventories.map(i => ({ id: i.id, name: i.name }));

  // ── Aggregated totals ────────────────────────────────────────────────────────
  let totalEnMano       = 0;
  let totalEnLibrerias  = 0;
  let totalCirculacion  = 0;
  const bookTotals      = new Map<string, number>();

  for (const inv of inventories) {
    const byBook = stockMatrix.get(inv.id);
    if (!byBook) continue;
    for (const [bookId, qty] of byBook.entries()) {
      if (inv.isDefault)                                          totalEnMano      += qty;
      else if (inv.channels.some(c => c.type === "BOOKSTORE"))   totalEnLibrerias += qty;
      totalCirculacion += qty;
      bookTotals.set(bookId, (bookTotals.get(bookId) ?? 0) + qty);
    }
  }

  const bookTotalEntries = [...bookTotals.entries()].filter(([, qty]) => qty !== 0);

  return (
    <main className="p-5 md:p-8 max-w-4xl">
      <header className="mb-5 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text)] font-heading">
            Inventario
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {inventories.length} {inventories.length === 1 ? "inventario" : "inventarios"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <TransferStockModal books={bookOptions} inventories={inventoryOptions} />
          <AdjustStockModal books={bookOptions} inventories={inventoryOptions} />
          <AddInventoryModal />
        </div>
      </header>

      {/* ── Stats strip ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "En mano",          value: totalEnMano,      icon: Home,   hint: "Inventario principal" },
          { label: "En librerías",     value: totalEnLibrerias, icon: Store,  hint: "Inventarios de librerías" },
          { label: "Total circulación",value: totalCirculacion, icon: Layers, hint: "Suma de todos" },
        ].map(({ label, value, icon: Icon, hint }) => (
          <Card key={label} className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-1.5">
                <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">{label}</p>
                <Icon size={13} className="text-[var(--color-accent)] mt-0.5 shrink-0" />
              </div>
              <p className={`text-xl font-semibold ${value < 0 ? "text-[var(--color-danger)]" : "text-[var(--color-text)]"} font-heading`}>
                {value} ej.
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Per-inventory cards ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        {inventories.map(inv => {
          const byBook = stockMatrix.get(inv.id);
          const total  = byBook ? [...byBook.values()].reduce((s, v) => s + v, 0) : 0;
          return (
            <Card key={inv.id} className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-[var(--radius-md)] bg-[var(--color-accent-light)] text-[var(--color-accent)]">
                    <Package size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-[var(--color-text)]">{inv.name}</span>
                      {inv.isDefault && (
                        <Badge variant="secondary" className="text-[11px] px-2 py-0 border-0 bg-[var(--color-accent-light)] text-[var(--color-accent)]">
                          Principal
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      {inv.channels.length === 0
                        ? "Sin canales asociados"
                        : `Canales: ${inv.channels.map(c => c.name).join(", ")}`}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold shrink-0 ${total < 0 ? "text-[var(--color-danger)]" : "text-[var(--color-text)]"}`}>
                    {total} ej.
                  </span>
                  <div className="flex items-center gap-3 shrink-0">
                    <EditInventoryButton id={inv.id} name={inv.name} />
                    {!inv.isDefault && <DeleteInventoryButton id={inv.id} name={inv.name} />}
                  </div>
                </div>

                {/* Per-book breakdown */}
                {byBook && [...byBook.entries()].some(([, v]) => v !== 0) && (
                  <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex flex-wrap gap-x-5 gap-y-1">
                    {[...byBook.entries()]
                      .filter(([, v]) => v !== 0)
                      .map(([bookId, qty]) => (
                        <span key={bookId} className="text-xs text-[var(--color-text-muted)]">
                          {books.find(b => b.id === bookId)?.title ?? "Libro"}:{" "}
                          <strong className={qty < 0 ? "text-[var(--color-danger)]" : "text-[var(--color-text)]"}>{qty}</strong>
                        </span>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {/* ── Total por libro ────────────────────────────────────────────────── */}
        {bookTotalEntries.length > 0 && (
          <Card className="border-[var(--color-border)] bg-[var(--color-accent-light)]/40 shadow-[var(--shadow-card)]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-[var(--radius-md)] bg-[var(--color-accent-light)] text-[var(--color-accent)]">
                  <Layers size={18} />
                </div>
                <div>
                  <p className="font-medium text-sm text-[var(--color-text)]">Total por libro</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Suma de todos los inventarios</p>
                </div>
                <span className="ml-auto text-sm font-semibold text-[var(--color-text)]">
                  {totalCirculacion} ej.
                </span>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1.5 pt-3 border-t border-[var(--color-border)]">
                {bookTotalEntries.map(([bookId, qty]) => (
                  <span key={bookId} className="text-xs text-[var(--color-text-muted)]">
                    {books.find(b => b.id === bookId)?.title ?? "Libro"}:{" "}
                    <strong className={`${qty < 0 ? "text-[var(--color-danger)]" : "text-[var(--color-accent)]"}`}>
                      {qty}
                    </strong>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
