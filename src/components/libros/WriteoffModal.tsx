"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { writeoffBook } from "@/actions/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

export default function WriteoffModal({
  bookId,
  maxQty,
}: {
  bookId: string;
  maxQty: number;
}) {
  const [open, setOpen]              = useState(false);
  const [quantity, setQuantity]      = useState("1");
  const [notes, setNotes]            = useState("");
  const [error, setError]            = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClose() {
    if (isPending) return;
    setOpen(false);
    setQuantity("1"); setNotes(""); setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qty = parseInt(quantity);
    if (qty < 1 || qty > maxQty) {
      setError(`Cantidad inválida (máx. ${maxQty})`);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await writeoffBook({ bookId, quantity: qty, notes: notes || undefined });
      if (result.error) setError(result.error);
      else { handleClose(); router.refresh(); }
    });
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="sm"
        variant="outline"
        className="gap-1.5 text-[var(--color-danger)] border-[var(--color-danger)]/30 hover:bg-[var(--color-danger)]/6 hover:text-[var(--color-danger)]"
      >
        Registrar baja
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "oklch(0% 0 0 / 0.35)", backdropFilter: "blur(4px)" }}
          onClick={handleClose}
        >
          <div
            className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] w-full max-w-sm shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
              <h2
                className="text-lg font-semibold text-[var(--color-text)]"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Registrar baja de inventario
              </h2>
              <button
                onClick={handleClose}
                disabled={isPending}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <p className="text-sm text-[var(--color-text-muted)]">
                Ejemplares dañados, perdidos, de uso personal o regalo que salen del inventario.
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="wo-qty">
                  Cantidad <span className="text-[var(--color-danger)]">*</span>
                </Label>
                <Input
                  id="wo-qty"
                  type="number"
                  min="1"
                  max={maxQty}
                  step="1"
                  inputMode="numeric"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  required
                  autoFocus
                />
                <p className="text-xs text-[var(--color-text-muted)]">
                  Stock en mano disponible: {maxQty} ej.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wo-notes">
                  Motivo{" "}
                  <span className="text-xs font-normal text-[var(--color-text-muted)]">(opcional)</span>
                </Label>
                <Input
                  id="wo-notes"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Dañados en feria, regalo, uso personal…"
                />
              </div>

              {error && (
                <p className="text-sm text-[var(--color-danger)] bg-[var(--color-danger)]/8 rounded-[var(--radius-sm)] px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isPending || !quantity}
                  className="bg-[var(--color-danger)] hover:bg-[var(--color-danger)]/90 text-white border-0"
                >
                  {isPending ? "Registrando..." : "Confirmar baja"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
