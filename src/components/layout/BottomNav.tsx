"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  DollarSign,
  BarChart3,
  Settings,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Inicio" },
  { href: "/libros", icon: BookOpen, label: "Libros" },
  { href: "/finanzas", icon: DollarSign, label: "Finanzas" },
  { href: "/reportes", icon: BarChart3, label: "Reportes" },
  { href: "/configuracion", icon: Settings, label: "Config" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex md:hidden z-30 safe-area-inset-bottom">
      {navItems.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors duration-[var(--duration-fast)]",
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
    </nav>
  );
}
