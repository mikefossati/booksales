"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateExchange } from "@/actions/exchanges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExchangeStatus } from "@/generated/prisma/client";

type ExchangeData = {
  id: string;
  recipient: string;
  expectedResult: string | null;
  deadlineAt: Date | null;
  status: ExchangeStatus;
  evidenceUrl: string | null;
  notes: string | null;
};

const STATUS_OPTIONS: { value: ExchangeStatus; label: string; icon: string }[] = [
  { value: "PENDING",     label: "Pendiente",   icon: "🟡" },
  { value: "FULFILLED",   label: "Cumplido",    icon: "✅" },
  { value: "UNFULFILLED", label: "No cumplido", icon: "🔴" },
];

export default function EditExchangeModal({ exchange }: { exchange: ExchangeData }) {
  const toDateStr = (d: Date | null) =>
    d ? new Date(d).toISOString().split("T")[0] : "";

  const [open, setOpen]               = useState(false);
  const [recipient, setRecipient]     = useState(exchange.recipient);
  const [expectedResult, setExpected] = useState(exchange.expectedResult ?? "");
  const [deadlineAt, setDeadline]     = useState(toDateStr(exchange.deadlineAt));
  const [status, setStatus]           = useState<ExchangeStatus>(exchange.status);
  const [evidenceUrl, setEvidence]    = useState(exchange.evidenceUrl ?? "");
  const [notes, setNotes]             = useState(exchange.notes ?? "");
  const [error, setError]             = useState<string | null>(null);
  const [isPending, startTransition]  = useTransition();
  const router = useRouter();

  function handleOpen() {
    setRecipient(exchange.recipient);
    setExpected(exchange.expectedResult ?? "");
    setDeadline(toDateStr(exchange.deadlineAt));
    setStatus(exchange.status);
    setEvidence(exchange.evidenceUrl ?? "");
    setNotes(exchange.notes ?? "");
    setError(null);
    setOpen(true);
  }

  function handleClose() {
    if (isPending) return;
    setOpen(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateExchange({
        id:             exchange.id,
        recipient,
        expectedResult: expectedResult || undefined,
        deadlineAt:     deadlineAt     || undefined,
        status,
        evidenceUrl:    evidenceUrl    || undefined,
        notes:          notes          || undefined,
      });
      if (result.error) setError(result.error);
      else { handleClose(); router.refresh(); }
    });
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-light)] transition-colors"
        title="Editar canje"
      >
        <Pencil size={14} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "oklch(0% 0 0 / 0.35)", backdropFilter: "blur(4px)" }}
          onClick={handleClose}
        >
          <div
            className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] sticky top-0 bg-[var(--color-surface)]">
              <h2 className="text-lg font-semibold text-[var(--color-text)]" style={{ fontFamily: "var(--font-heading)" }}>
                Editar canje
              </h2>
              <button onClick={handleClose} disabled={isPending} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-exc-recipient">
                  Destinatario <span className="text-[var(--color-danger)]">*</span>
                </Label>
                <Input
                  id="edit-exc-recipient"
                  value={recipient}
                  onChange={e => setRecipient(e.target.value)}
                  placeholder="Nombre o @cuenta"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label>Estado</Label>
                <div className="flex gap-2">
                  {STATUS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStatus(opt.value)}
                      className={cn(
                        "flex-1 py-2 rounded-[var(--radius-md)] border text-xs font-medium transition-colors",
                        status === opt.value
                          ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]"
                          : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]"
                      )}
                    >
                      {opt.icon} {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {status === "FULFILLED" && (
                <div className="space-y-1.5">
                  <Label htmlFor="edit-exc-evidence">
                    Link de evidencia{" "}
                    <span className="text-xs font-normal text-[var(--color-text-muted)]">(opcional)</span>
                  </Label>
                  <Input
                    id="edit-exc-evidence"
                    type="url"
                    value={evidenceUrl}
                    onChange={e => setEvidence(e.target.value)}
                    placeholder="https://www.instagram.com/p/..."
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="edit-exc-result">
                  ¿Qué acordaron?{" "}
                  <span className="text-xs font-normal text-[var(--color-text-muted)]">(opcional)</span>
                </Label>
                <Input
                  id="edit-exc-result"
                  value={expectedResult}
                  onChange={e => setExpected(e.target.value)}
                  placeholder="Reseña en Instagram antes del 30 de junio"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-exc-deadline">
                  Fecha límite{" "}
                  <span className="text-xs font-normal text-[var(--color-text-muted)]">(opcional)</span>
                </Label>
                <Input
                  id="edit-exc-deadline"
                  type="date"
                  value={deadlineAt}
                  onChange={e => setDeadline(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-exc-notes">
                  Notas{" "}
                  <span className="text-xs font-normal text-[var(--color-text-muted)]">(opcional)</span>
                </Label>
                <Input
                  id="edit-exc-notes"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Observaciones adicionales"
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
                <Button type="submit" disabled={isPending || !recipient.trim()}>
                  {isPending ? "Guardando..." : "Guardar cambios"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
