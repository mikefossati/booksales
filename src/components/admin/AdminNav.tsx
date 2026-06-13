import Link from "next/link";
import { LayoutDashboard, Users, LogOut } from "lucide-react";

const NAV = [
  { href: "/admin",          label: "Dashboard",  icon: LayoutDashboard },
  { href: "/admin/accounts", label: "Cuentas",    icon: Users           },
];

export default function AdminNav() {
  return (
    <aside className="w-56 shrink-0 bg-[var(--color-text)] text-white min-h-screen flex flex-col">
      <div className="px-5 py-5 border-b border-white/10">
        <p className="text-xs font-semibold tracking-widest uppercase text-white/40">
          Admin
        </p>
        <p className="text-sm font-semibold text-white mt-0.5">Autoriapp</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius-sm)] text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Icon size={15} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <Link
          href="/"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius-sm)] text-sm text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <LogOut size={15} />
          Volver al app
        </Link>
      </div>
    </aside>
  );
}
