"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createExchange } from "@/actions/exchanges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import { useModalA11y } from "@/hooks/useModalA11y";

type BookOption = { id: string; title: string };

export default function AddExchangeModal({
  accountId,
  books,
}: {
  accountId: string;
  books: BookOption[];
}) {
  const today = new Date().toISOString().split("T")[0];

  const [open, setOpen]                   = useState(false);
  const [bookId, setBookId]               = useState(books[0]?.id ?? "");
  const [recipient, setRecipient]         = useState("");
  const [quantity, setQuantity]           = useState("1");
  const [sentAt, setSentAt]               = useState(today);
  const [expectedResult, setExpected]     = useState("");
  const [deadlineAt, setDeadline]         = useState("");
  const [notes, setNotes]                 = useState("");
  const [error, setError]                 = useState<string | null>(null);
  const [isPending, startTransition]      = useTransition();
  const router = useRouter();

  const panelRef = useModalA11y<HTMLDivElement>(open, handleClose);

  function handleClose() {
    if (isPending) return;
    setOpen(false);
    setRecipient(""); setQuantity("1"); setSentAt(today);
    setExpected(""); setDeadline(""); setNotes(""); setError(null);
    if (books[0]) setBookId(books[0].id);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createExchange({
        accountId,
        bookId,
        recipient,
        quantity:       parseInt(quantity),
        sentAt,
        expectedResult: expectedResult || undefined,
        deadlineAt:     deadlineAt     || undefined,
        notes:          notes          || undefined,
      });
      if (result.error) setError(result.error);
      else { handleClose(); router.refresh(); }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm" className="gap-1.5">
        <Plus size={14} />
        Nuevo canje
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "oklch(0% 0 0 / 0.35)", backdropFilter: "blur(4px)" }}
          onClick={handleClose}
        >
          <div
            className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto"
            ref={panelRef} role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] sticky top-0 bg-[var(--color-surface)]">
              <h2 className="text-lg font-semibold text-[var(--color-text)]" style={{ fontFamily: "var(--font-heading)" }}>
                Registrar canje
              </h2>
              <button onClick={handleClose} disabled={isPending} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="exc-recipient">
                  ¿A quién le enviaste el libro? <span className="text-[var(--color-danger)]">*</span>
                </Label>
                <Input
                  id="exc-recipient"
                  value={recipient}
                  onChange={e => setRecipient(e.target.value)}
                  placeholder="Nombre o @cuenta de Instagram"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label>Libro <span className="text-[var(--color-danger)]">*</span></Label>
                {books.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-muted)]">Agrega un libro primero.</p>
                ) : (
                  <select
                    value={bookId}
                    onChange={e => setBookId(e.target.value)}
                    className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)]"
                    required
                  >
                    {books.map(b => (
                      <option key={b.id} value={b.id}>{b.title}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="exc-qty">
                    Ejemplares <span className="text-[var(--color-danger)]">*</span>
                  </Label>
                  <Input
                    id="exc-qty"
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    placeholder="1"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="exc-sent">¿Cuándo lo enviaste?</Label>
                  <Input
                    id="exc-sent"
                    type="date"
                    value={sentAt}
                    onChange={e => setSentAt(e.target.value)}
                    max={today}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exc-result">
                  ¿Qué acordaron?{" "}
                  <span className="text-xs font-normal text-[var(--color-text-muted)]">(opcional)</span>
                </Label>
                <Input
                  id="exc-result"
                  value={expectedResult}
                  onChange={e => setExpected(e.target.value)}
                  placeholder="Reseña en Instagram antes del 30 de junio"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exc-deadline">
                  Fecha límite{" "}
                  <span className="text-xs font-normal text-[var(--color-text-muted)]">(opcional)</span>
                </Label>
                <Input
                  id="exc-deadline"
                  type="date"
                  value={deadlineAt}
                  onChange={e => setDeadline(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exc-notes">
                  Notas{" "}
                  <span className="text-xs font-normal text-[var(--color-text-muted)]">(opcional)</span>
                </Label>
                <Input
                  id="exc-notes"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Dirección de envío, acuerdo adicional…"
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
                <Button type="submit" disabled={isPending || !recipient.trim() || !bookId || !quantity}>
                  {isPending ? "Guardando..." : "Registrar canje"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
