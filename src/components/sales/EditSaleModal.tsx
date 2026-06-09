"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSale } from "@/actions/sales";
import { SaleStatus } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, X, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useModalA11y } from "@/hooks/useModalA11y";

type Channel = { id: string; name: string };

const STATUS_OPTIONS: { value: SaleStatus; label: string }[] = [
  { value: "CONFIRMED",         label: "Confirmada"            },
  { value: "PENDING_DELIVERY",  label: "Pendiente de entrega"  },
  { value: "DELIVERED",         label: "Entregada"             },
  { value: "CANCELLED",         label: "Cancelada"             },
];

const PAYMENT_METHODS = ["Efectivo", "Transferencia", "Tarjeta"];

type SaleData = {
  id: string;
  quantity: number;
  unitPrice: { toString(): string } | string | number;
  totalAmount: { toString(): string } | string | number;
  isBulk: boolean;
  currency: string;
  fxRateToCLP: { toString(): string } | string | number | null;
  channelId: string;
  saleDate: Date | string;
  paymentMethod: string | null;
  status: SaleStatus;
  notes: string | null;
};

export default function EditSaleModal({
  sale,
  channels,
}: {
  sale: SaleData;
  channels: Channel[];
}) {
  const initialDate = new Date(sale.saleDate).toISOString().split("T")[0];

  const isForeignCurrency = sale.currency !== "CLP";

  const [open, setOpen]               = useState(false);
  const [quantity, setQuantity]       = useState(sale.quantity);
  const [unitPrice, setUnitPrice]     = useState(Number(sale.unitPrice.toString()).toFixed(0));
  const [priceMode, setPriceMode]     = useState<"unit" | "total">(sale.isBulk ? "total" : "unit");
  const [bulkTotal, setBulkTotal]     = useState(Number(sale.totalAmount.toString()).toFixed(0));
  const [fxRate, setFxRate]           = useState(sale.fxRateToCLP ? Number(sale.fxRateToCLP.toString()).toFixed(4) : "");
  const [channelId, setChannelId]     = useState(sale.channelId);
  const [saleDate, setSaleDate]       = useState(initialDate);
  const [paymentMethod, setPaymentMethod] = useState(sale.paymentMethod ?? "Efectivo");
  const [status, setStatus]           = useState<SaleStatus>(sale.status);
  const [notes, setNotes]             = useState(sale.notes ?? "");
  const [error, setError]             = useState<string | null>(null);
  const [isPending, startTransition]  = useTransition();
  const router = useRouter();

  const panelRef = useModalA11y<HTMLDivElement>(open, handleClose);

  function handleClose() {
    if (isPending) return;
    setOpen(false);
    setError(null);
  }

  const isBulkMode = priceMode === "total";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const pricing = isBulkMode
        ? { isBulk: true,  totalAmount: parseFloat(bulkTotal) }
        : { isBulk: false, unitPrice: parseFloat(unitPrice) };
      const result = await updateSale({
        id: sale.id,
        quantity,
        ...pricing,
        channelId,
        saleDate,
        fxRateToCLP: isForeignCurrency && fxRate ? parseFloat(fxRate) : null,
        paymentMethod: paymentMethod || undefined,
        status,
        notes: notes || undefined,
      });
      if (result.error) setError(result.error);
      else { handleClose(); router.refresh(); }
    });
  }

  const total = isBulkMode
    ? (parseFloat(bulkTotal) || 0)
    : quantity * (parseFloat(unitPrice) || 0);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
        title="Editar venta"
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
              <h2 className="text-lg font-semibold text-[var(--color-text)]" style={{ fontFamily: "var(--font-heading)" }}>
                Editar venta
              </h2>
              <button onClick={handleClose} disabled={isPending} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Cantidad</Label>
                  <div className="flex items-center border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden">
                    <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3 py-2 text-[var(--color-text-muted)] hover:bg-[var(--color-accent-light)] hover:text-[var(--color-accent)] transition-colors">
                      <Minus size={14} />
                    </button>
                    <span className="flex-1 text-center text-sm font-semibold">{quantity}</span>
                    <button type="button" onClick={() => setQuantity(quantity + 1)}
                      className="px-3 py-2 text-[var(--color-text-muted)] hover:bg-[var(--color-accent-light)] hover:text-[var(--color-accent)] transition-colors">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex gap-2" role="group" aria-label="Modo de precio">
                    {([["unit", "Precio unit."], ["total", "Total"]] as const).map(([value, label]) => (
                      <button key={value} type="button" onClick={() => setPriceMode(value)}
                        className={cn(
                          "text-xs font-medium transition-colors",
                          priceMode === value
                            ? "text-[var(--color-accent)] underline underline-offset-4"
                            : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                        )}>
                        {label}
                      </button>
                    ))}
                  </div>
                  {isBulkMode ? (
                    <Input id="es-total" type="number" min="0" step="1" inputMode="numeric"
                      value={bulkTotal} onChange={e => setBulkTotal(e.target.value)} required />
                  ) : (
                    <Input id="es-price" type="number" min="0" step="1" inputMode="numeric"
                      value={unitPrice} onChange={e => setUnitPrice(e.target.value)} required />
                  )}
                </div>
              </div>

              {isBulkMode && total > 0 && quantity > 0 && (
                <p className="text-[10px] text-[var(--color-text-muted)] -mt-2">
                  ≈ {sale.currency} {Math.round(total / quantity).toLocaleString("es-CL")} por ejemplar
                </p>
              )}

              {isForeignCurrency && (
                <div className="space-y-1.5 rounded-[var(--radius-md)] bg-[var(--color-accent-light)]/60 px-3 py-2.5">
                  <Label htmlFor="es-fx">
                    Tipo de cambio — 1 {sale.currency} =
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="es-fx"
                      type="number" min="0" step="0.0001" inputMode="decimal"
                      value={fxRate}
                      onChange={e => setFxRate(e.target.value)}
                      placeholder="0.0000"
                      className="text-sm"
                    />
                    <span className="text-sm text-[var(--color-text-muted)] shrink-0">CLP</span>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Canal</Label>
                <select value={channelId} onChange={e => setChannelId(e.target.value)}
                  className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)]">
                  {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="es-date">Fecha</Label>
                  <Input id="es-date" type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Pago</Label>
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)]">
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Estado</Label>
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_OPTIONS.map(({ value, label }) => (
                    <button key={value} type="button" onClick={() => setStatus(value)}
                      className={cn(
                        "py-2 px-3 rounded-[var(--radius-md)] border text-xs font-medium transition-colors text-left",
                        status === value
                          ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]"
                          : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]"
                      )}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="es-notes">Notas</Label>
                <Input id="es-notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opcional" />
              </div>

              {error && (
                <p className="text-sm text-[var(--color-danger)] bg-[var(--color-danger)]/8 rounded-[var(--radius-sm)] px-3 py-2">{error}</p>
              )}

              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]" style={{ fontFamily: "var(--font-heading)" }}>
                    {sale.currency} {total.toLocaleString("es-CL")}
                  </p>
                  {isForeignCurrency && fxRate && (
                    <p className="text-xs text-[var(--color-text-muted)]">
                      ≈ CLP {Math.round(total * parseFloat(fxRate)).toLocaleString("es-CL")}
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>Cancelar</Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Guardando..." : "Guardar"}
                  </Button>
                </div>
              </div>  {/* flex items-center justify-between */}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
