"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inviteUserByEmail } from "@/actions/members";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/generated/prisma/client";
import { useModalA11y } from "@/hooks/useModalA11y";

const ROLE_OPTIONS: { value: UserRole; label: string; description: string }[] = [
  { value: "EDITOR", label: "Editor",  description: "Puede registrar ventas y ver reportes" },
  { value: "VIEWER", label: "Visor",   description: "Solo puede ver reportes y exportar" },
];

export default function InviteUserModal({ accountId }: { accountId: string }) {
  const [open, setOpen]              = useState(false);
  const [email, setEmail]            = useState("");
  const [role, setRole]              = useState<UserRole>("VIEWER");
  const [error, setError]            = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const panelRef = useModalA11y<HTMLDivElement>(open, handleClose);

  function handleClose() {
    if (isPending) return;
    setOpen(false); setEmail(""); setRole("VIEWER"); setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    startTransition(async () => {
      const result = await inviteUserByEmail({ accountId, email, role });
      if (result.error) setError(result.error);
      else { handleClose(); router.refresh(); }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm" className="gap-1.5">
        <UserPlus size={14} />
        Agregar usuario
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "oklch(0% 0 0 / 0.35)", backdropFilter: "blur(4px)" }}
          onClick={handleClose}
        >
          <div
            className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] w-full max-w-md shadow-xl"
            ref={panelRef} role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
              <h2 className="text-lg font-semibold text-[var(--color-text)]" style={{ fontFamily: "var(--font-heading)" }}>
                Agregar usuario
              </h2>
              <button onClick={handleClose} disabled={isPending} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="invite-email">
                  Correo electrónico <span className="text-[var(--color-danger)]">*</span>
                </Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  required
                  autoFocus
                />
                <p className="text-xs text-[var(--color-text-muted)]">
                  El usuario debe haber creado una cuenta previamente.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Rol</Label>
                <div className="space-y-2">
                  {ROLE_OPTIONS.map(opt => (
                    <label
                      key={opt.value}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-[var(--radius-md)] border cursor-pointer transition-colors",
                        role === opt.value
                          ? "border-[var(--color-accent)] bg-[var(--color-accent-light)]"
                          : "border-[var(--color-border)] hover:border-[var(--color-accent)]/50"
                      )}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={opt.value}
                        checked={role === opt.value}
                        onChange={() => setRole(opt.value)}
                        className="mt-0.5 accent-[var(--color-accent)]"
                      />
                      <div>
                        <p className="text-sm font-medium text-[var(--color-text)]">{opt.label}</p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{opt.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-sm text-[var(--color-danger)] bg-[var(--color-danger)]/8 rounded-[var(--radius-sm)] px-3 py-2">{error}</p>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>Cancelar</Button>
                <Button type="submit" disabled={isPending || !email}>
                  {isPending ? "Agregando..." : "Agregar usuario"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
