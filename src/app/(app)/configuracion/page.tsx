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
import InviteUserModal from "@/components/configuracion/InviteUserModal";
import ChangeMemberRoleButton from "@/components/configuracion/ChangeMemberRoleButton";
import RevokeMemberButton from "@/components/configuracion/RevokeMemberButton";
import { Globe, Store, Users, CalendarClock, Crown } from "lucide-react";
import type { ChannelType, UserRole } from "@/generated/prisma/client";

const TYPE_META: Record<ChannelType, { label: string; icon: React.ElementType; color: string }> = {
  DIGITAL:   { label: "Digital",  icon: Globe,         color: "bg-blue-50 text-blue-600"                            },
  BOOKSTORE: { label: "Librería", icon: Store,         color: "bg-green-50 text-green-700"                          },
  DIRECT:    { label: "Directo",  icon: Users,         color: "bg-[var(--color-accent-light)] text-[var(--color-accent)]" },
  PRESALE:   { label: "Preventa", icon: CalendarClock, color: "bg-purple-50 text-purple-700"                        },
};

const ROLE_LABELS: Record<UserRole, string> = {
  OWNER:  "Propietaria",
  EDITOR: "Editor",
  VIEWER: "Visor",
};

function Avatar({ name, email, avatarUrl, size = "md" }: { name?: string | null; email: string; avatarUrl?: string | null; size?: "sm" | "md" }) {
  const initials = (name || email || "?").charAt(0).toUpperCase();
  const dim = size === "sm" ? "w-8 h-8 text-sm" : "w-10 h-10 text-base";
  return (
    <div className={`${dim} rounded-full bg-[var(--color-accent-light)] flex items-center justify-center shrink-0 overflow-hidden`}>
      {avatarUrl
        ? <img src={avatarUrl} alt={name ?? email} className="w-full h-full object-cover" />
        : <span className="font-semibold text-[var(--color-accent)]">{initials}</span>}
    </div>
  );
}

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

  const [channels, profile, members, ownerProfile] = await Promise.all([
    prisma.channel.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.profile.findUnique({
      where: { supabaseId: user.id },
    }),
    prisma.accountMember.findMany({
      where: { accountId: account.id },
      include: { profile: { select: { id: true, email: true, displayName: true, avatarUrl: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.profile.findUnique({
      where: { id: account.ownerId },
      select: { id: true, email: true, displayName: true, avatarUrl: true },
    }),
  ]);

  const isOwner = ownerProfile?.id === profile?.id;

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

      {/* ── USUARIOS ──────────────────────────────────────────────────────── */}
      {tab === "usuarios" && (
        <div className="space-y-5">
          {isOwner && (
            <div className="flex justify-end">
              <InviteUserModal accountId={account.id} />
            </div>
          )}

          <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)]">
            {/* Owner row */}
            {ownerProfile && (
              <div className="flex items-center gap-4 px-5 py-4 border-b border-[var(--color-border)]">
                <Avatar name={ownerProfile.displayName} email={ownerProfile.email} avatarUrl={ownerProfile.avatarUrl} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text)]">
                    {ownerProfile.displayName ?? ownerProfile.email}
                  </p>
                  {ownerProfile.displayName && (
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{ownerProfile.email}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-accent)]">
                    <Crown size={12} />
                    {ROLE_LABELS.OWNER}
                  </span>
                </div>
              </div>
            )}

            {/* Members */}
            {members.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-[var(--color-text-muted)]">Solo tú tienes acceso a esta cuenta.</p>
                {isOwner && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    Usa "Agregar usuario" para dar acceso a tu contador o asistente.
                  </p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {members.map(m => (
                  <div key={m.id} className="flex items-center gap-4 px-5 py-4">
                    <Avatar name={m.profile.displayName} email={m.profile.email} avatarUrl={m.profile.avatarUrl} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text)]">
                        {m.profile.displayName ?? m.profile.email}
                      </p>
                      {m.profile.displayName && (
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{m.profile.email}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isOwner ? (
                        <>
                          <ChangeMemberRoleButton memberId={m.id} currentRole={m.role} />
                          <RevokeMemberButton memberId={m.id} name={m.profile.displayName ?? m.profile.email} />
                        </>
                      ) : (
                        <span className="text-xs text-[var(--color-text-muted)]">{ROLE_LABELS[m.role]}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── SEGURIDAD ─────────────────────────────────────────────────────── */}
      {tab === "seguridad" && <SeguridadForm />}
    </main>
  );
}
