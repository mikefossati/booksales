"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  Store,
  Package,
  DollarSign,
  BarChart3,
  Settings,
  LogOut,
  HelpCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AutoriappLogo } from "@/components/brand/Logo";

const navItems = [
  { href: "/dashboard",  icon: LayoutDashboard, label: "Inicio" },
  { href: "/libros",     icon: BookOpen,        label: "Mis Libros" },
  { href: "/canales",    icon: Store,           label: "Canales" },
  { href: "/inventario", icon: Package,         label: "Inventario" },
  { href: "/finanzas",   icon: DollarSign,      label: "Finanzas" },
  { href: "/reportes",   icon: BarChart3,       label: "Reportes" },
  { href: "/configuracion", icon: Settings,     label: "Configuración" },
  { href: "/ayuda",         icon: HelpCircle,  label: "Ayuda" },
];

export default function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const router   = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const initials = userEmail ? userEmail[0].toUpperCase() : "?";

  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-[var(--color-surface)] border-r border-[var(--color-border)] hidden md:flex flex-col z-30">
      <div className="h-20 flex items-center px-6 border-b border-[var(--color-border)]">
        <AutoriappLogo size="lg" />
      </div>

      <nav className="flex-1 py-4 px-3 space-y-0.5">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-sm font-medium transition-colors duration-[var(--duration-fast)]",
                active
                  ? "bg-[var(--color-accent)] text-white"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-accent-light)] hover:text-[var(--color-text)]"
              )}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-[var(--color-border)]">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-7 h-7 rounded-full bg-[var(--color-accent-light)] flex items-center justify-center text-xs font-semibold text-[var(--color-accent)] shrink-0">
            {initials}
          </div>
          <span className="flex-1 text-xs text-[var(--color-text-muted)] truncate">
            {userEmail}
          </span>
          <button
            onClick={handleLogout}
            className="p-2 -m-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/8 transition-colors"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
