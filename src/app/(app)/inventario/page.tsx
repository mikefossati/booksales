import { createClient } from "@/lib/supabase/server";
import { getOrCreateAccount } from "@/lib/account";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddInventoryModal, EditInventoryButton, DeleteInventoryButton } from "@/components/configuracion/InventoryModals";
import { TransferStockModal, AdjustStockModal } from "@/components/configuracion/StockActionModals";
import { calcStockMatrix } from "@/lib/finance";
import { Package } from "lucide-react";

export default async function InventarioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const account = await getOrCreateAccount(user.id, user.email ?? "");

  const [inventories, books, bookMovements] = await Promise.all([
    prisma.inventory.findMany({
      where:   { accountId: account.id },
      select:  { id: true, name: true, isDefault: true, channels: { select: { id: true, name: true } } },
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

  return (
    <main className="p-5 md:p-8 max-w-4xl">
      <header className="mb-5 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text)]" style={{ fontFamily: "var(--font-heading)" }}>
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
                        <Badge variant="secondary" className="text-[10px] px-2 py-0 border-0 bg-[var(--color-accent-light)] text-[var(--color-accent)]">
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
      </div>
    </main>
  );
}
