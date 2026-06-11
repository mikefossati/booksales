"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useModalA11y } from "@/hooks/useModalA11y";
import {
  LayoutDashboard,
  BookOpen,
  DollarSign,
  BarChart3,
  Settings,
  HelpCircle,
  Store,
  Package,
  MoreHorizontal,
} from "lucide-react";

const mainItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Inicio" },
  { href: "/libros",    icon: BookOpen,        label: "Libros" },
  { href: "/finanzas",  icon: DollarSign,      label: "Finanzas" },
  { href: "/reportes",  icon: BarChart3,       label: "Reportes" },
];

const moreItems = [
  { href: "/canales",       icon: Store,      label: "Canales" },
  { href: "/inventario",    icon: Package,    label: "Inventario" },
  { href: "/configuracion", icon: Settings,   label: "Configuración" },
  { href: "/ayuda",         icon: HelpCircle, label: "Ayuda" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export default function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = moreItems.some(({ href }) => isActive(pathname, href));
  const panelRef = useModalA11y<HTMLDivElement>(moreOpen, () => setMoreOpen(false));

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex md:hidden z-30 safe-area-inset-bottom">
        {mainItems.map(({ href, icon: Icon, label }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex-1 h-16 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors duration-[var(--duration-fast)]",
                active
                  ? "text-[var(--color-accent)]"
                  : "text-[var(--color-text-muted)]"
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.75} />
              <span>{label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          className={cn(
            "flex-1 h-16 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors duration-[var(--duration-fast)]",
            moreActive || moreOpen
              ? "text-[var(--color-accent)]"
              : "text-[var(--color-text-muted)]"
          )}
        >
          <MoreHorizontal size={22} strokeWidth={moreActive ? 2.5 : 1.75} />
          <span>Más</span>
        </button>
      </nav>

      {moreOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden flex items-end"
          style={{ backgroundColor: "oklch(0% 0 0 / 0.35)", backdropFilter: "blur(4px)" }}
          onClick={() => setMoreOpen(false)}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Más opciones"
            onClick={e => e.stopPropagation()}
            className="w-full bg-[var(--color-surface)] rounded-t-[var(--radius-lg)] shadow-[var(--shadow-float)] safe-area-inset-bottom"
          >
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="w-9 h-1 rounded-full bg-[var(--color-border)]" />
            </div>
            <nav className="px-3 pb-3" aria-label="Secciones adicionales">
              {moreItems.map(({ href, icon: Icon, label }) => {
                const active = isActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMoreOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3.5 rounded-[var(--radius-md)] text-sm font-medium transition-colors duration-[var(--duration-fast)]",
                      active
                        ? "bg-[var(--color-accent)] text-white"
                        : "text-[var(--color-text)] hover:bg-[var(--color-accent-light)]"
                    )}
                  >
                    <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
