"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordPayment } from "@/actions/payments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, CheckCircle } from "lucide-react";
import { useModalA11y } from "@/hooks/useModalA11y";

export default function RecordPaymentModal({
  channelId,
  channelName,
  outstandingAmount,
  currency,
}: {
  channelId: string;
  channelName: string;
  outstandingAmount: number;
  currency: string;
}) {
  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().split("T")[0];

  const [open, setOpen]               = useState(false);
  const [amount, setAmount]           = useState(outstandingAmount.toFixed(0));
  const [showPeriod, setShowPeriod]   = useState(false);
  const [periodStart, setPeriodStart] = useState(firstOfMonth);
  const [periodEnd, setPeriodEnd]     = useState(today);
  const [receivedAt, setReceivedAt]   = useState(today);
  const [notes, setNotes]             = useState("");
  const [error, setError]             = useState<string | null>(null);
  const [isPending, startTransition]  = useTransition();
  const router = useRouter();

  const panelRef = useModalA11y<HTMLDivElement>(open, handleClose);

  function handleClose() {
    if (isPending) return;
    setOpen(false);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await recordPayment({
        channelId,
        amount:      parseFloat(amount),
        currency,
        periodStart: showPeriod ? periodStart : undefined,
        periodEnd:   showPeriod ? periodEnd   : undefined,
        receivedAt,
        notes: notes || undefined,
      });
      if (result.error) setError(result.error);
      else { handleClose(); router.refresh(); }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-accent-light)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white transition-colors"
      >
        <CheckCircle size={12} />
        Registrar cobro
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "oklch(0% 0 0 / 0.35)", backdropFilter: "blur(4px)" }}
          onClick={handleClose}
        >
          <div
            className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] w-full max-w-sm shadow-xl"
            ref={panelRef} role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-text)] font-heading">
                  Registrar cobro
                </h2>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{channelName}</p>
              </div>
              <button onClick={handleClose} disabled={isPending} aria-label="Cerrar" className="p-2 -m-2 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pay-amount">Monto recibido <span className="text-[var(--color-danger)]">*</span></Label>
                  <Input id="pay-amount" type="number" min="0" step="1" inputMode="numeric"
                    value={amount} onChange={e => setAmount(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pay-received">Fecha de cobro</Label>
                  <Input id="pay-received" type="date" value={receivedAt} onChange={e => setReceivedAt(e.target.value)} max={today} />
                </div>
              </div>

              {/* Settlement window — optional, collapsed by default */}
              {!showPeriod ? (
                <button
                  type="button"
                  onClick={() => setShowPeriod(true)}
                  className="text-xs font-medium text-[var(--color-accent)] hover:underline"
                >
                  + Agregar período que cubre (opcional)
                </button>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Período que cubre</Label>
                    <button
                      type="button"
                      onClick={() => setShowPeriod(false)}
                      className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                    >
                      Quitar
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="date" aria-label="Inicio del período" value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
                    <Input type="date" aria-label="Fin del período" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    desde · hasta — la ventana de ventas que esta liquidación salda
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="pay-notes">Notas <span className="text-xs font-normal text-[var(--color-text-muted)]">(opcional)</span></Label>
                <Input id="pay-notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Número de transferencia, referencia, etc." />
              </div>

              {error && (
                <p className="text-sm text-[var(--color-danger)] bg-[var(--color-danger)]/8 rounded-[var(--radius-sm)] px-3 py-2">{error}</p>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>Cancelar</Button>
                <Button type="submit" disabled={isPending || !amount}>
                  {isPending ? "Guardando..." : "Confirmar cobro"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
