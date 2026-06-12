"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { dismissNotification, undoDismissNotification } from "@/actions/notifications";
import type { AppNotification } from "@/lib/notifications";
import {
  Truck,
  PackageCheck,
  Banknote,
  Package,
  Handshake,
  ChevronRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_VISIBLE = 5;

const TYPE_ICON: Record<AppNotification["type"], React.ElementType> = {
  INCOMING_PRINT_RUN: Truck,
  RUN_ARRIVED:        PackageCheck,
  PAYMENT_DUE:        Banknote,
  LOW_STOCK:          Package,
  EXCHANGE_OVERDUE:   Handshake,
};

const SEVERITY_STYLE: Record<AppNotification["severity"], { card: string; icon: string }> = {
  action: {
    card: "bg-[var(--color-warning)]/10 border-[var(--color-warning)]/30",
    icon: "text-[var(--color-warning-text)]",
  },
  warning: {
    card: "bg-[var(--color-warning)]/10 border-[var(--color-warning)]/30",
    icon: "text-[var(--color-warning-text)]",
  },
  info: {
    card: "bg-[var(--color-accent-light)]/60 border-[var(--color-accent)]/20",
    icon: "text-[var(--color-accent)]",
  },
  success: {
    card: "bg-[var(--color-success)]/8 border-[var(--color-success)]/25",
    icon: "text-[var(--color-success)]",
  },
};

export default function NotificationsPanel({
  notifications,
}: {
  notifications: AppNotification[];
}) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const router = useRouter();

  const visible = notifications.filter(n => !hidden.has(n.key));
  const shown = showAll ? visible : visible.slice(0, MAX_VISIBLE);
  const remaining = visible.length - shown.length;

  if (visible.length === 0) return null;

  function hide(key: string) {
    setHidden(prev => new Set(prev).add(key));
  }
  function unhide(key: string) {
    setHidden(prev => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }

  async function handleDismiss(n: AppNotification) {
    hide(n.key); // optimistic
    const result = await dismissNotification(n.key);
    if (result.error) {
      unhide(n.key);
      toast.error(result.error);
      return;
    }
    toast("Notificación ocultada", {
      action: {
        label: "Deshacer",
        onClick: async () => {
          const undo = await undoDismissNotification(n.key);
          if (undo.error) {
            toast.error(undo.error);
            return;
          }
          unhide(n.key);
          router.refresh();
        },
      },
    });
    router.refresh();
  }

  return (
    <section aria-label="Notificaciones" className="space-y-1.5">
      {shown.map(n => {
        const Icon = TYPE_ICON[n.type];
        const style = SEVERITY_STYLE[n.severity];
        const body = (
          <>
            <span className="text-xs text-[var(--color-text)] flex-1 leading-snug">{n.message}</span>
            {n.href && <ChevronRight size={13} className="text-[var(--color-text-muted)] shrink-0" />}
          </>
        );
        return (
          <div
            key={n.key}
            className={cn(
              "flex items-center gap-2.5 pl-3 pr-1.5 py-1.5 rounded-[var(--radius-md)] border",
              style.card,
            )}
          >
            <Icon size={15} className={cn("shrink-0", style.icon)} aria-hidden="true" />
            {n.href ? (
              <Link href={n.href} className="flex-1 flex items-center gap-2 min-w-0 py-1 hover:opacity-80 transition-opacity">
                {body}
              </Link>
            ) : (
              <div className="flex-1 flex items-center gap-2 min-w-0 py-1">{body}</div>
            )}
            {n.dismissible && (
              <button
                type="button"
                onClick={() => handleDismiss(n)}
                aria-label={`Ocultar notificación: ${n.message}`}
                title="Ocultar"
                className="p-2 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg)]/60 transition-colors shrink-0"
              >
                <X size={13} />
              </button>
            )}
          </div>
        );
      })}

      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="text-xs font-medium text-[var(--color-accent)] hover:underline px-1 py-1"
        >
          Ver {remaining} {remaining === 1 ? "notificación más" : "notificaciones más"}
        </button>
      )}
    </section>
  );
}
