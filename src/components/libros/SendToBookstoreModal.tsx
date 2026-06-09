"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendToBookstore } from "@/actions/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useModalA11y } from "@/hooks/useModalA11y";

type Channel = { id: string; name: string };

export default function SendToBookstoreModal({
  bookId,
  bookstoreChannels,
  maxQty,
}: {
  bookId: string;
  bookstoreChannels: Channel[];
  maxQty: number;
}) {
  const [open, setOpen]              = useState(false);
  const [channelId, setChannelId]    = useState(bookstoreChannels[0]?.id ?? "");
  const [quantity, setQuantity]      = useState("");
  const [notes, setNotes]            = useState("");
  const [error, setError]            = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (bookstoreChannels.length === 0) return null;

  const panelRef = useModalA11y<HTMLDivElement>(open, handleClose);

  function handleClose() {
    if (isPending) return;
    setOpen(false);
    setQuantity(""); setNotes(""); setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qty = parseInt(quantity);
    if (qty > maxQty) {
      setError(`Solo tienes ${maxQty} ejemplares disponibles.`);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await sendToBookstore({ bookId, channelId, quantity: qty, notes: notes || undefined });
      if (result.error) setError(result.error);
      else { handleClose(); router.refresh(); }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm" variant="outline" className="gap-1.5">
        <Store size={14} />
        Enviar a librería
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "oklch(0% 0 0 / 0.35)", backdropFilter: "blur(4px)" }}
          onClick={handleClose}
        >
          <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] w-full max-w-sm shadow-xl" ref={panelRef} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
              <h2 className="text-lg font-semibold text-[var(--color-text)]" style={{ fontFamily: "var(--font-heading)" }}>
                Enviar a librería
              </h2>
              <button onClick={handleClose} disabled={isPending} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {bookstoreChannels.length > 1 && (
                <div className="space-y-2">
                  <Label>Librería</Label>
                  <div className="space-y-1.5">
                    {bookstoreChannels.map((c) => (
                      <label key={c.id} className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] border cursor-pointer transition-colors",
                        channelId === c.id
                          ? "border-[var(--color-accent)] bg-[var(--color-accent-light)]"
                          : "border-[var(--color-border)] hover:border-[var(--color-accent)]/50"
                      )}>
                        <input type="radio" name="ch" value={c.id} checked={channelId === c.id} onChange={() => setChannelId(c.id)} className="accent-[var(--color-accent)]" />
                        <span className="text-sm text-[var(--color-text)]">{c.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="stb-qty">
                  Cantidad <span className="text-[var(--color-danger)]">*</span>
                  <span className="ml-1.5 font-normal text-[var(--color-text-muted)]">(máx. {maxQty})</span>
                </Label>
                <Input
                  id="stb-qty" type="number" min="1" max={maxQty} step="1"
                  value={quantity} onChange={(e) => setQuantity(e.target.value)}
                  placeholder="20" required inputMode="numeric"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="stb-notes">Notas <span className="text-xs font-normal text-[var(--color-text-muted)]">(opcional)</span></Label>
                <Input id="stb-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Consignación 60 días" />
              </div>

              {error && (
                <p className="text-sm text-[var(--color-danger)] bg-[var(--color-danger)]/8 rounded-[var(--radius-sm)] px-3 py-2">{error}</p>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>Cancelar</Button>
                <Button type="submit" disabled={isPending || !quantity || parseInt(quantity) < 1}>{isPending ? "Registrando..." : "Confirmar envío"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
