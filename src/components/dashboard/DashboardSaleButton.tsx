"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSale } from "@/actions/sales";
import { fetchRateToCLP } from "@/lib/fx";
import { todayLocal } from "@/lib/dates";
import { toast } from "sonner";
import { Plus, X, BookOpen, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useModalA11y } from "@/hooks/useModalA11y";

type Book    = { id: string; title: string; coverUrl: string | null };
type Channel = { id: string; name: string; type: string; currency: string | null };

const PAYMENT_METHODS = [
  { value: "Efectivo",      label: "💵 Efectivo" },
  { value: "Transferencia", label: "📱 Transf."  },
  { value: "Tarjeta",       label: "💳 Tarjeta"  },
];

export default function DashboardSaleButton({
  accountCurrency,
  books,
  channels,
  lastPrices = {},
}: {
  accountCurrency: string;
  books: Book[];
  channels: Channel[];
  lastPrices?: Record<string, number>;
}) {
  const [open, setOpen]           = useState(false);
  const [bookId, setBookId]       = useState(books[0]?.id ?? "");
  const [channelId, setChannelId] = useState(channels[0]?.id ?? "");
  const [quantity, setQuantity]   = useState(1);
  const [unitPrice, setUnitPrice] = useState("");
  const [priceMode, setPriceMode] = useState<"unit" | "total">("unit");
  const [bulkTotal, setBulkTotal] = useState("");
  const [payment, setPayment]     = useState("Efectivo");
  const [saleDate, setSaleDate]   = useState(todayLocal());
  const [fxRate, setFxRate]       = useState("");
  const [fxLoading, setFxLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const panelRef = useModalA11y<HTMLFormElement>(open, () => { if (!isPending) setOpen(false); });
  const router = useRouter();

  const selectedChannel = channels.find(c => c.id === channelId);
  const saleCurrency    = selectedChannel?.currency ?? "CLP";
  const needsFx         = saleCurrency !== accountCurrency;
  const isBulkMode      = priceMode === "total";
  const total           = isBulkMode
    ? (parseFloat(bulkTotal) || 0)
    : quantity * (parseFloat(unitPrice) || 0);
  const totalCLP        = needsFx && fxRate ? total * parseFloat(fxRate) : total;

  useEffect(() => {
    const curr = channels.find(c => c.id === channelId)?.currency ?? "CLP";
    if (curr === accountCurrency) { setFxRate(""); return; }
    setFxLoading(true);
    fetchRateToCLP(curr, saleDate !== todayLocal() ? saleDate : undefined)
      .then(rate => { if (rate) setFxRate(rate.toFixed(4)); })
      .catch(() => {})
      .finally(() => setFxLoading(false));
  }, [channelId, saleDate]);

  useEffect(() => {
    if (bookId && channelId) {
      const price = lastPrices[`${bookId}_${channelId}`];
      setUnitPrice(price ? price.toFixed(0) : "");
    }
  }, [bookId, channelId]);

  function fmt(n: number, curr = accountCurrency) {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: curr, maximumFractionDigits: 0 }).format(n);
  }

  function handleOpen() {
    const b0 = books[0]?.id ?? "";
    const c0 = channels[0]?.id ?? "";
    setBookId(b0); setChannelId(c0); setQuantity(1); setPayment("Efectivo");
    setSaleDate(todayLocal());
    setPriceMode("unit"); setBulkTotal("");
    setFxRate(""); setFxLoading(false);
    setUnitPrice(b0 && c0 ? (lastPrices[`${b0}_${c0}`]?.toFixed(0) ?? "") : "");
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bookId || !channelId) return;
    if (isBulkMode ? !bulkTotal : !unitPrice) return;
    const fxRateToCLP = needsFx && fxRate ? parseFloat(fxRate) : undefined;
    const pricing = isBulkMode
      ? { isBulk: true,  totalAmount: parseFloat(bulkTotal) }
      : { isBulk: false, unitPrice: parseFloat(unitPrice) };
    startTransition(async () => {
      const result = await createSale({
        bookId, channelId, quantity,
        ...pricing,
        currency: saleCurrency, fxRateToCLP, paymentMethod: payment,
        saleDate,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Venta registrada — ${fmt(totalCLP)}`);
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white text-xs font-medium hover:opacity-90 transition-opacity"
      >
        <Plus size={12} />
        Venta
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
          style={{ backgroundColor: "oklch(0% 0 0 / 0.35)", backdropFilter: "blur(4px)" }}
          onClick={() => { if (!isPending) setOpen(false); }}
        >
          <form
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Registrar venta"
            onSubmit={handleSubmit}
            className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] w-full max-w-sm shadow-xl overflow-hidden max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] shrink-0">
              <h2 className="text-lg font-semibold text-[var(--color-text)]" style={{ fontFamily: "var(--font-heading)" }}>
                Registrar venta
              </h2>
              <button type="button" onClick={() => setOpen(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-5">
              {/* Book */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Libro</label>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {books.map(b => (
                    <button key={b.id} type="button" onClick={() => setBookId(b.id)}
                      className={cn(
                        "shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-[var(--radius-md)] border-2 transition-colors w-20",
                        bookId === b.id
                          ? "border-[var(--color-accent)] bg-[var(--color-accent-light)]"
                          : "border-[var(--color-border)] hover:border-[var(--color-accent)]/50"
                      )}>
                      <div className="w-12 h-16 rounded bg-[var(--color-accent-light)] flex items-center justify-center overflow-hidden">
                        {b.coverUrl
                          ? <img src={b.coverUrl} alt={b.title} className="w-full h-full object-cover" />
                          : <BookOpen size={16} className="text-[var(--color-accent)] opacity-50" />}
                      </div>
                      <span className="text-[10px] text-[var(--color-text)] line-clamp-2 text-center leading-tight">{b.title}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Qty + price */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Cantidad</label>
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
                  <div className="flex gap-1" role="group" aria-label="Modo de precio">
                    {([["unit", "Precio unit."], ["total", "Total"]] as const).map(([value, label]) => (
                      <button key={value} type="button" onClick={() => setPriceMode(value)}
                        className={cn(
                          "text-xs font-medium uppercase tracking-wide transition-colors",
                          priceMode === value
                            ? "text-[var(--color-accent)] underline underline-offset-4"
                            : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                        )}>
                        {label}
                      </button>
                    ))}
                  </div>
                  {isBulkMode ? (
                    <Input type="number" min="0" step="1" inputMode="numeric"
                      value={bulkTotal} onChange={e => setBulkTotal(e.target.value)}
                      placeholder="75000" required className="text-sm" />
                  ) : (
                    <Input type="number" min="0" step="1" inputMode="numeric"
                      value={unitPrice} onChange={e => setUnitPrice(e.target.value)}
                      placeholder="8000" required className="text-sm" />
                  )}
                </div>
              </div>

              {isBulkMode && total > 0 && quantity > 0 && (
                <p className="text-[10px] text-[var(--color-text-muted)] -mt-3">
                  ≈ {fmt(total / quantity, saleCurrency)} por ejemplar
                </p>
              )}

              {/* Sale date — editable to register past sales */}
              <div className="space-y-1.5">
                <label htmlFor="ds-sale-date" className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Fecha</label>
                <Input id="ds-sale-date" type="date"
                  value={saleDate} onChange={e => setSaleDate(e.target.value)}
                  max={todayLocal()} required className="text-sm" />
              </div>

              {/* FX */}
              {needsFx && (
                <div className="space-y-1.5 rounded-[var(--radius-md)] bg-[var(--color-accent-light)]/60 px-3 py-2.5">
                  <label className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
                    1 {saleCurrency} = {fxLoading ? "cargando…" : ""}
                  </label>
                  <div className="flex items-center gap-2">
                    <Input type="number" min="0" step="0.0001" inputMode="decimal"
                      value={fxRate} onChange={e => setFxRate(e.target.value)}
                      placeholder="0.0000" required className="text-sm h-8" />
                    <span className="text-xs text-[var(--color-text-muted)] shrink-0">CLP</span>
                  </div>
                  {fxRate && total > 0 && (
                    <p className="text-[10px] text-[var(--color-text-muted)]">≈ {fmt(totalCLP)} total</p>
                  )}
                </div>
              )}

              {/* Channel */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Canal</label>
                <div className="space-y-1.5">
                  {channels.map(c => (
                    <label key={c.id} className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] border cursor-pointer transition-colors",
                      channelId === c.id
                        ? "border-[var(--color-accent)] bg-[var(--color-accent-light)]"
                        : "border-[var(--color-border)] hover:border-[var(--color-accent)]/50"
                    )}>
                      <input type="radio" name="ds-ch" value={c.id} checked={channelId === c.id}
                        onChange={() => setChannelId(c.id)} className="accent-[var(--color-accent)]" />
                      <span className="text-sm text-[var(--color-text)] flex-1">{c.name}</span>
                      {c.currency && c.currency !== "CLP" && (
                        <span className="text-[10px] text-[var(--color-text-muted)] font-medium">{c.currency}</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Payment */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Pago</label>
                <div className="flex gap-2">
                  {PAYMENT_METHODS.map(({ value, label }) => (
                    <button key={value} type="button" onClick={() => setPayment(value)}
                      className={cn(
                        "flex-1 px-2 py-2 rounded-[var(--radius-md)] border text-xs font-medium transition-colors",
                        payment === value
                          ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]"
                          : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]"
                      )}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-5 pb-5 pt-3 flex items-center justify-between gap-3 border-t border-[var(--color-border)] shrink-0">
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">Total</p>
                <p className="text-xl font-semibold text-[var(--color-text)]" style={{ fontFamily: "var(--font-heading)" }}>
                  {fmt(total, saleCurrency)}
                </p>
                {needsFx && fxRate && (
                  <p className="text-xs text-[var(--color-text-muted)]">≈ {fmt(totalCLP)}</p>
                )}
              </div>
              <Button type="submit" disabled={
                isPending || !bookId || (needsFx && !fxRate) ||
                (isBulkMode ? !bulkTotal : !unitPrice)
              }>
                {isPending ? "Registrando…" : "Registrar"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
