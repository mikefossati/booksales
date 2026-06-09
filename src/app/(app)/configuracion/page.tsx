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
import { Globe, Store, Users, CalendarClock } from "lucide-react";
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

  const [channels, profile] = await Promise.all([
    prisma.channel.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.profile.findUnique({
      where: { supabaseId: user.id },
    }),
  ]);

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
            <AddChannelModal accountId={account.id} />
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
              <AddChannelModal accountId={account.id} />
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
                      <EditChannelModal channel={ch} />
                      <DeleteChannelButton id={ch.id} name={ch.name} />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── SEGURIDAD ─────────────────────────────────────────────────────── */}
      {tab === "seguridad" && <SeguridadForm />}
    </main>
  );
}
