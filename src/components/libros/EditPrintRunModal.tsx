"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePrintRun } from "@/actions/printRuns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, X } from "lucide-react";
import { useModalA11y } from "@/hooks/useModalA11y";

type PrintRunData = {
  id: string;
  quantity: number;
  totalCost: number;
  supplier: string | null;
  receivedAt: Date;
  notes: string | null;
};

export default function EditPrintRunModal({ run }: { run: PrintRunData }) {
  const toDateStr = (d: Date) => new Date(d).toISOString().split("T")[0];
  const today     = new Date().toISOString().split("T")[0];

  const [open, setOpen]             = useState(false);
  const [quantity, setQuantity]     = useState(String(run.quantity));
  const [totalCost, setTotalCost]   = useState(String(run.totalCost));
  const [supplier, setSupplier]     = useState(run.supplier ?? "");
  const [receivedAt, setReceivedAt] = useState(toDateStr(run.receivedAt));
  const [notes, setNotes]           = useState(run.notes ?? "");
  const [error, setError]           = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const costPerUnit =
    quantity && totalCost
      ? (parseFloat(totalCost) / parseInt(quantity)).toFixed(0)
      : null;

  function handleOpen() {
    setQuantity(String(run.quantity));
    setTotalCost(String(run.totalCost));
    setSupplier(run.supplier ?? "");
    setReceivedAt(toDateStr(run.receivedAt));
    setNotes(run.notes ?? "");
    setError(null);
    setOpen(true);
  }

  const panelRef = useModalA11y<HTMLDivElement>(open, handleClose);

  function handleClose() {
    if (isPending) return;
    setOpen(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updatePrintRun({
        id:        run.id,
        quantity:  parseInt(quantity),
        totalCost: parseFloat(totalCost),
        supplier:  supplier  || undefined,
        receivedAt,
        notes:     notes     || undefined,
      });
      if (result.error) setError(result.error);
      else { handleClose(); router.refresh(); }
    });
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="p-2 -m-0.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-light)] transition-colors"
        aria-label="Editar tirada" title="Editar tirada"
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
            className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] w-full max-w-md shadow-xl"
            ref={panelRef} role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
              <h2 className="text-lg font-semibold text-[var(--color-text)] font-heading">
                Editar tirada
              </h2>
              <button onClick={handleClose} disabled={isPending} aria-label="Cerrar" className="p-2 -m-2 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-pr-qty">Ejemplares <span className="text-[var(--color-danger)]">*</span></Label>
                  <Input
                    id="edit-pr-qty" type="number" min="1" step="1"
                    value={quantity} onChange={e => setQuantity(e.target.value)}
                    placeholder="200" required inputMode="numeric" autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-pr-cost">Costo total <span className="text-[var(--color-danger)]">*</span></Label>
                  <Input
                    id="edit-pr-cost" type="number" min="0" step="1"
                    value={totalCost} onChange={e => setTotalCost(e.target.value)}
                    placeholder="500000" required inputMode="numeric"
                  />
                </div>
              </div>

              {costPerUnit && (
                <p className="text-xs text-[var(--color-text-muted)] -mt-2">
                  Costo por ejemplar: <span className="font-medium text-[var(--color-text)]">${parseInt(costPerUnit).toLocaleString("es-CL")}</span>
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-pr-date">Fecha de recepción</Label>
                  <Input
                    id="edit-pr-date" type="date"
                    value={receivedAt} onChange={e => setReceivedAt(e.target.value)}
                    max={today}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-pr-supplier">Proveedor</Label>
                  <Input
                    id="edit-pr-supplier"
                    value={supplier} onChange={e => setSupplier(e.target.value)}
                    placeholder="Imprenta Nombre"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-pr-notes">Notas <span className="text-xs font-normal text-[var(--color-text-muted)]">(opcional)</span></Label>
                <Input
                  id="edit-pr-notes"
                  value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Papel obra 90g, tapa dura…"
                />
              </div>

              {error && (
                <p className="text-sm text-[var(--color-danger)] bg-[var(--color-danger)]/8 rounded-[var(--radius-sm)] px-3 py-2">{error}</p>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>Cancelar</Button>
                <Button type="submit" disabled={isPending || !quantity || !totalCost}>
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
