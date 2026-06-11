"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addProductionBatch } from "@/actions/merchandise";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import { useModalA11y } from "@/hooks/useModalA11y";

export default function AddBatchModal({
  merchandiseId,
  productName,
}: {
  merchandiseId: string;
  productName: string;
}) {
  const today = new Date().toISOString().split("T")[0];

  const [open, setOpen]              = useState(false);
  const [quantity, setQuantity]      = useState("");
  const [totalCost, setTotalCost]    = useState("");
  const [supplier, setSupplier]      = useState("");
  const [receivedAt, setReceivedAt]  = useState(today);
  const [error, setError]            = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const costPerUnit =
    quantity && totalCost
      ? (parseFloat(totalCost) / parseInt(quantity)).toFixed(0)
      : null;

  const panelRef = useModalA11y<HTMLDivElement>(open, handleClose);

  function handleClose() {
    if (isPending) return;
    setOpen(false);
    setQuantity(""); setTotalCost(""); setSupplier(""); setReceivedAt(today); setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addProductionBatch({
        merchandiseId,
        quantity:   parseInt(quantity),
        totalCost:  parseFloat(totalCost),
        supplier:   supplier  || undefined,
        receivedAt,
      });
      if (result.error) setError(result.error);
      else { handleClose(); router.refresh(); }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
        title={`Nuevo lote para ${productName}`}
      >
        <Plus size={12} />
        Lote
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
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-text)] font-heading">
                  Nuevo lote de producción
                </h2>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{productName}</p>
              </div>
              <button onClick={handleClose} disabled={isPending} aria-label="Cerrar" className="p-2 -m-2 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="batch-qty">
                    Cantidad <span className="text-[var(--color-danger)]">*</span>
                  </Label>
                  <Input
                    id="batch-qty"
                    type="number" min="1" step="1" inputMode="numeric"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    placeholder="50"
                    required
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="batch-cost">
                    Costo total <span className="text-[var(--color-danger)]">*</span>
                  </Label>
                  <Input
                    id="batch-cost"
                    type="number" min="0" step="1" inputMode="numeric"
                    value={totalCost}
                    onChange={e => setTotalCost(e.target.value)}
                    placeholder="150000"
                    required
                  />
                </div>
              </div>

              {costPerUnit && (
                <p className="text-xs text-[var(--color-text-muted)] -mt-2">
                  Costo por unidad:{" "}
                  <span className="font-medium text-[var(--color-text)]">
                    ${parseInt(costPerUnit).toLocaleString("es-CL")}
                  </span>
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="batch-date">Fecha de recepción</Label>
                  <Input
                    id="batch-date"
                    type="date"
                    value={receivedAt}
                    onChange={e => setReceivedAt(e.target.value)}
                    max={today}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="batch-supplier">Proveedor</Label>
                  <Input
                    id="batch-supplier"
                    value={supplier}
                    onChange={e => setSupplier(e.target.value)}
                    placeholder="Nombre del proveedor"
                  />
                </div>
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
                <Button type="submit" disabled={isPending || !quantity || !totalCost}>
                  {isPending ? "Guardando..." : "Registrar lote"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
