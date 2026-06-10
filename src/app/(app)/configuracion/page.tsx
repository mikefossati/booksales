import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateAccount } from "@/lib/account";
import { prisma } from "@/lib/prisma";
import ConfigTabNav from "@/components/configuracion/ConfigTabNav";
import EditProfileForm from "@/components/configuracion/EditProfileForm";
import PreferenciasForm from "@/components/configuracion/PreferenciasForm";
import SeguridadForm from "@/components/configuracion/SeguridadForm";
import { Store, Package, ChevronRight } from "lucide-react";

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

  const profile = await prisma.profile.findUnique({
    where: { supabaseId: user.id },
  });

  return (
    <main className="p-5 md:p-8 max-w-4xl">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold text-[var(--color-text)]" style={{ fontFamily: "var(--font-heading)" }}>
          Configuración
        </h1>
      </header>

      {/* Mobile quick links — Canales/Inventario live in the sidebar on desktop */}
      <div className="md:hidden grid grid-cols-2 gap-3 mb-5">
        {[
          { href: "/canales",    icon: Store,   label: "Canales" },
          { href: "/inventario", icon: Package, label: "Inventario" },
        ].map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href}
            className="flex items-center gap-2.5 px-4 py-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] hover:border-[var(--color-accent)] transition-colors">
            <Icon size={16} className="text-[var(--color-accent)]" />
            <span className="flex-1 text-sm font-medium text-[var(--color-text)]">{label}</span>
            <ChevronRight size={14} className="text-[var(--color-text-muted)]" />
          </Link>
        ))}
      </div>

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

      {/* ── SEGURIDAD ─────────────────────────────────────────────────────── */}
      {tab === "seguridad" && <SeguridadForm />}
    </main>
  );
}
