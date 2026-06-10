import { createClient } from "@/lib/supabase/server";
import { getOrCreateAccount } from "@/lib/account";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AddChannelModal from "@/components/configuracion/AddChannelModal";
import EditChannelModal from "@/components/configuracion/EditChannelModal";
import DeleteChannelButton from "@/components/configuracion/DeleteChannelButton";
import { Globe, Store, Users } from "lucide-react";
import type { ChannelType } from "@/generated/prisma/client";

const TYPE_META: Record<ChannelType, { label: string; icon: React.ElementType; color: string }> = {
  DIGITAL:   { label: "Digital",  icon: Globe,         color: "bg-blue-50 text-blue-600"                            },
  BOOKSTORE: { label: "Librería", icon: Store,         color: "bg-green-50 text-green-700"                          },
  DIRECT:    { label: "Directo",  icon: Users,         color: "bg-[var(--color-accent-light)] text-[var(--color-accent)]" },
};

export default async function CanalesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const account = await getOrCreateAccount(user.id, user.email ?? "");

  const [channels, inventories] = await Promise.all([
    prisma.channel.findMany({
      where: { accountId: account.id },
      include: { inventory: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.inventory.findMany({
      where:   { accountId: account.id },
      select:  { id: true, name: true },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    }),
  ]);

  const inventoryOptions = inventories.map(i => ({ id: i.id, name: i.name }));

  return (
    <main className="p-5 md:p-8 max-w-4xl">
      <header className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text)]" style={{ fontFamily: "var(--font-heading)" }}>
            Canales
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {channels.length === 0
              ? "Aún no tienes canales configurados"
              : `${channels.length} ${channels.length === 1 ? "canal" : "canales"}`}
          </p>
        </div>
        <AddChannelModal accountId={account.id} inventories={inventoryOptions} />
      </header>

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
                      {[ch.currency ?? "CLP", ch.city, ch.inventory ? `Inventario: ${ch.inventory.name}` : "Sin inventario"]
                        .filter(Boolean)
                        .join(" · ")}
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
    </main>
  );
}
