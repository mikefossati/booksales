"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, LogOut } from "lucide-react";
import ConfirmDialog from "@/components/ui/confirm-dialog";

export default function SeguridadForm() {
  const [newPw, setNewPw]               = useState("");
  const [confirmPw, setConfirmPw]       = useState("");
  const [pwSaved, setPwSaved]           = useState(false);
  const [pwError, setPwError]           = useState<string | null>(null);
  const [pwLoading, setPwLoading]       = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const router = useRouter();

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null); setPwSaved(false);
    if (newPw.length < 8)  { setPwError("La contraseña debe tener al menos 8 caracteres."); return; }
    if (newPw !== confirmPw) { setPwError("Las contraseñas no coinciden."); return; }

    setPwLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwLoading(false);

    if (error) { setPwError(error.message); }
    else { setPwSaved(true); setNewPw(""); setConfirmPw(""); }
  }

  async function handleLogoutAll() {
    setLogoutLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut({ scope: "global" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="space-y-8 max-w-md">
      <section>
        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-4">Cambiar contraseña</h3>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-pw">Nueva contraseña</Label>
            <Input
              id="new-pw"
              type="password"
              value={newPw}
              onChange={e => { setNewPw(e.target.value); setPwSaved(false); setPwError(null); }}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-pw">Confirmar contraseña</Label>
            <Input
              id="confirm-pw"
              type="password"
              value={confirmPw}
              onChange={e => { setConfirmPw(e.target.value); setPwError(null); }}
              placeholder="Repite la nueva contraseña"
              autoComplete="new-password"
            />
          </div>

          {pwError && (
            <p className="text-sm text-[var(--color-danger)] bg-[var(--color-danger)]/8 rounded-[var(--radius-sm)] px-3 py-2">{pwError}</p>
          )}
          {pwSaved && (
            <p className="flex items-center gap-1.5 text-sm text-[var(--color-success)]">
              <CheckCircle2 size={15} /> Contraseña actualizada
            </p>
          )}

          <Button type="submit" disabled={pwLoading || !newPw || !confirmPw}>
            {pwLoading ? "Actualizando..." : "Cambiar contraseña"}
          </Button>
        </form>
      </section>

      <section className="pt-2 border-t border-[var(--color-border)]">
        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-1">Cerrar sesión en todos los dispositivos</h3>
        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          Cierra sesión en todos los dispositivos donde hayas iniciado sesión, incluido este.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => setLogoutConfirm(true)}
          disabled={logoutLoading}
          className="gap-2 text-[var(--color-danger)] border-[var(--color-danger)]/30 hover:bg-[var(--color-danger)]/6 hover:text-[var(--color-danger)]"
        >
          <LogOut size={15} />
          {logoutLoading ? "Cerrando sesiones..." : "Cerrar todas las sesiones"}
        </Button>
        <ConfirmDialog
          open={logoutConfirm}
          title="¿Cerrar sesión en todos tus dispositivos?"
          description="Tendrás que volver a iniciar sesión, incluido en este dispositivo."
          confirmLabel="Cerrar sesiones"
          loadingLabel="Cerrando sesiones..."
          loading={logoutLoading}
          onConfirm={handleLogoutAll}
          onClose={() => setLogoutConfirm(false)}
        />
      </section>
    </div>
  );
}
