import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateAccount } from "@/lib/account";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ConfigTabNav from "@/components/configuracion/ConfigTabNav";
import AddChannelModal from "@/components/configuracion/AddChannelModal";
import EditChannelModal from "@/components/configuracion/EditChannelModal";
import DeleteChannelButton from "@/components/configuracion/DeleteChannelButton";
import EditProfileForm from "@/components/configuracion/EditProfileForm";
import PreferenciasForm from "@/components/configuracion/PreferenciasForm";
import SeguridadForm from "@/components/configuracion/SeguridadForm";
import { AddInventoryModal, EditInventoryButton, DeleteInventoryButton } from "@/components/configuracion/InventoryModals";
import { TransferStockModal, AdjustStockModal } from "@/components/configuracion/StockActionModals";
import { calcStockMatrix } from "@/lib/finance";
import { Globe, Store, Users, CalendarClock, Package } from "lucide-react";
import type { ChannelType } from "@/generated/prisma/client";

const TYPE_META: Record<ChannelType, { label: string; icon: React.ElementType; color: string }> = {
  DIGITAL:   { label: "Digital",  icon: Globe,         color: "bg-blue-50 text-blue-600"                            },
  BOOKSTORE: { label: "Librería", icon: Store,         color: "bg-green-50 text-green-700"                          },
  DIRECT:    { label: "Directo",  icon: Users,         color: "bg-[var(--color-accent-light)] text-[var(--color-accent)]" },
  PRESALE:   { label: "Preventa", icon: CalendarClock, color: "bg-purple-50 text-purple-700"                        },
};

export default async function ConfiguracionPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "perfil" } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const account = await getOrCreateAccount(user.id, user.email ?? "");

  const [channels, profile, inventories, books, bookMovements] = await Promise.all([
    prisma.channel.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.profile.findUnique({
      where: { supabaseId: user.id },
    }),
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

  const stockMatrix = calcStockMatrix(bookMovements);
  const bookOptions = books.map(b => ({ id: b.id, name: b.title }));
  const inventoryOptions = inventories.map(i => ({ id: i.id, name: i.name }));

  return (
    <main className="p-5 md:p-8 max-w-4xl">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold text-[var(--color-text)]" style={{ fontFamily: "var(--font-heading)" }}>
          Configuración
        </h1>
      </header>

      <Suspense>
        <ConfigTabNav />
      </Suspense>

      {/* ── PERFIL ────────────────────────────────────────────────────────── */}
      {tab === "perfil" && profile && (
        <EditProfileForm
          profile={{
            id:          profile.id,
            email:       profile.email,
            displayName: profile.displayName,
            avatarUrl:   profile.avatarUrl,
          }}
        />
      )}

      {/* ── PREFERENCIAS ──────────────────────────────────────────────────── */}
      {tab === "preferencias" && (
        <PreferenciasForm
          accountId={account.id}
          baseCurrency={account.baseCurrency}
          dateFormat={account.dateFormat}
        />
      )}

      {/* ── CANALES ───────────────────────────────────────────────────────── */}
      {tab === "canales" && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm text-[var(--color-text-muted)]">
              {channels.length === 0
                ? "Aún no tienes canales configurados"
                : `${channels.length} ${channels.length === 1 ? "canal" : "canales"}`}
            </p>
            <AddChannelModal accountId={account.id} inventories={inventoryOptions} />
          </div>

          {channels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[var(--color-accent-light)] flex items-center justify-center text-[var(--color-accent)]">
                <Globe size={28} />
              </div>
              <div>
                <p className="text-base font-medium text-[var(--color-text)]">Agrega tu primer canal</p>
                <p className="text-sm text-[var(--color-text-muted)] mt-1 max-w-xs">
                  Amazon, librerías, ferias, Instagram — cualquier lugar donde vendas.
                </p>
              </div>
              <AddChannelModal accountId={account.id} inventories={inventoryOptions} />
            </div>
          ) : (
            <div className="space-y-3">
              {channels.map(ch => {
                const meta = TYPE_META[ch.type];
                const Icon = meta.icon;
                return (
                  <Card key={ch.id} className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className={`p-2.5 rounded-[var(--radius-md)] ${meta.color}`}>
                        <Icon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-[var(--color-text)]">{ch.name}</span>
                          <Badge variant="secondary" className="text-[10px] px-2 py-0 border-0 bg-[var(--color-accent-light)] text-[var(--color-accent)]">
                            {meta.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                          {ch.type === "DIGITAL" && ch.royaltyPercent
                            ? `Regalías: ${ch.royaltyPercent}% · ${ch.currency ?? "CLP"}`
                            : ch.type === "BOOKSTORE" && ch.consignmentPercent
                            ? `Consignación: ${ch.consignmentPercent}%${ch.city ? ` · ${ch.city}` : ""}`
                            : ch.city ?? meta.label}
                        </p>
                      </div>
                      <EditChannelModal channel={ch} inventories={inventoryOptions} />
                      <DeleteChannelButton id={ch.id} name={ch.name} />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── INVENTARIOS ───────────────────────────────────────────────────── */}
      {tab === "inventarios" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm text-[var(--color-text-muted)]">
              {inventories.length} {inventories.length === 1 ? "inventario" : "inventarios"}
            </p>
            <div className="flex gap-2">
              <TransferStockModal books={bookOptions} inventories={inventoryOptions} />
              <AdjustStockModal books={bookOptions} inventories={inventoryOptions} />
              <AddInventoryModal />
            </div>
          </div>

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
        </div>
      )}

      {/* ── SEGURIDAD ─────────────────────────────────────────────────────── */}
      {tab === "seguridad" && <SeguridadForm />}
    </main>
  );
}
