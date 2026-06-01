"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSale } from "@/actions/sales";
import { createMerchSale } from "@/actions/merchandise";
import { toast } from "sonner";
import { Plus, X, BookOpen, ShoppingBag, Minus, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Book    = { id: string; title: string; coverUrl: string | null };
type Merch   = { id: string; name: string };
type Channel = { id: string; name: string; type: string; currency: string | null };

const PAYMENT_METHODS = [
  { value: "Efectivo",      label: "💵 Efectivo" },
  { value: "Transferencia", label: "📱 Transf."  },
  { value: "Tarjeta",       label: "💳 Tarjeta"  },
];

export default function QuickSaleFab({
  accountId,
  books,
  merch,
  channels,
  lastPrices = {},
  merchLastPrices = {},
}: {
  accountId: string;
  books: Book[];
  merch: Merch[];
  channels: Channel[];
  lastPrices?: Record<string, number>;
  merchLastPrices?: Record<string, number>;
}) {
  const [open, setOpen]           = useState(false);
  const [mode, setMode]           = useState<"libro" | "merch">("libro");
  const [bookId, setBookId]       = useState(books[0]?.id ?? "");
  const [merchId, setMerchId]     = useState(merch[0]?.id ?? "");
  const [channelId, setChannelId] = useState(channels[0]?.id ?? "");
  const [quantity, setQuantity]   = useState(1);
  const [unitPrice, setUnitPrice] = useState("");
  const [payment, setPayment]     = useState("Efectivo");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Pre-fill price when selection changes
  useEffect(() => {
    if (!channelId) return;
    if (mode === "libro" && bookId) {
      const price = lastPrices[`${bookId}_${channelId}`];
      setUnitPrice(price ? price.toFixed(0) : "");
    } else if (mode === "merch" && merchId) {
      const price = merchLastPrices[`${merchId}_${channelId}`];
      setUnitPrice(price ? price.toFixed(0) : "");
    }
  }, [bookId, merchId, channelId, mode]);

  const selectedChannel = channels.find(c => c.id === channelId);
  const currency        = selectedChannel?.currency ?? "CLP";
  const total           = quantity * (parseFloat(unitPrice) || 0);

  function handleOpen() {
    const b0 = books[0]?.id ?? "";
    const m0 = merch[0]?.id ?? "";
    const c0 = channels[0]?.id ?? "";
    setMode("libro"); setBookId(b0); setMerchId(m0); setChannelId(c0);
    setQuantity(1); setPayment("Efectivo");
    setUnitPrice(b0 && c0 ? (lastPrices[`${b0}_${c0}`]?.toFixed(0) ?? "") : "");
    setOpen(true);
  }

  function handleClose() {
    if (isPending) return;
    setOpen(false);
  }

  function formatMoney(n: number) {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!channelId || !unitPrice) return;

    startTransition(async () => {
      let result: { error?: string };

      if (mode === "libro") {
        if (!bookId) return;
        result = await createSale({ bookId, channelId, quantity, unitPrice: parseFloat(unitPrice), currency, paymentMethod: payment });
      } else {
        if (!merchId) return;
        result = await createMerchSale({ merchandiseId: merchId, channelId, quantity, unitPrice: parseFloat(unitPrice), currency, paymentMethod: payment });
      }

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Venta registrada — ${formatMoney(total)} sumados`);
        handleClose();
        router.refresh();
      }
    });
  }

  const hasItems = mode === "libro" ? books.length > 0 : merch.length > 0;
  const missingSetup = channels.length === 0 || (mode === "libro" && books.length === 0);

  if (missingSetup) {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 w-14 h-14 rounded-full bg-[var(--color-accent)] text-white shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-40"
          aria-label="Registrar venta"
        >
          <Plus size={24} />
        </button>
        {open && (
          <div
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
            style={{ backgroundColor: "oklch(0% 0 0 / 0.35)", backdropFilter: "blur(4px)" }}
            onClick={handleClose}
          >
            <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] w-full max-w-sm shadow-xl p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[var(--color-text)]" style={{ fontFamily: "var(--font-heading)" }}>Registrar venta</h2>
                <button onClick={handleClose}><X size={18} className="text-[var(--color-text-muted)]" /></button>
              </div>
              <div className="space-y-3 py-4">
                {books.length === 0 && (
                  <a href="/libros" className="flex items-center justify-between p-3 rounded-[var(--radius-md)] bg-[var(--color-accent-light)] text-[var(--color-accent)] text-sm font-medium" onClick={handleClose}>
                    <span>① Agrega al menos un libro</span>
                    <ChevronRight size={15} />
                  </a>
                )}
                {channels.length === 0 && (
                  <a href="/configuracion" className="flex items-center justify-between p-3 rounded-[var(--radius-md)] bg-[var(--color-accent-light)] text-[var(--color-accent)] text-sm font-medium" onClick={handleClose}>
                    <span>② Configura al menos un canal</span>
                    <ChevronRight size={15} />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 w-14 h-14 rounded-full bg-[var(--color-accent)] text-white shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-40"
        aria-label="Registrar venta"
      >
        <Plus size={24} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
          style={{ backgroundColor: "oklch(0% 0 0 / 0.35)", backdropFilter: "blur(4px)" }}
          onClick={handleClose}
        >
          <form
            onSubmit={handleSubmit}
            className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] w-full max-w-sm shadow-xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
              <h2 className="text-lg font-semibold text-[var(--color-text)]" style={{ fontFamily: "var(--font-heading)" }}>
                Registrar venta
              </h2>
              <button type="button" onClick={handleClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Mode toggle */}
              <div className="flex gap-2">
                {([
                  { value: "libro", label: "Libro",  icon: BookOpen   },
                  { value: "merch", label: "Merch",  icon: ShoppingBag },
                ] as { value: "libro" | "merch"; label: string; icon: React.ElementType }[]).map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => { setMode(value); setQuantity(1); setUnitPrice(""); }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[var(--radius-md)] border text-xs font-medium transition-colors",
                      mode === value
                        ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]"
                        : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]"
                    )}
                  >
                    <Icon size={13} />
                    {label}
                  </button>
                ))}
              </div>

              {/* Item selector */}
              {mode === "libro" ? (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Libro</label>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {books.map(b => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setBookId(b.id)}
                        className={cn(
                          "shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-[var(--radius-md)] border-2 transition-colors w-20",
                          bookId === b.id
                            ? "border-[var(--color-accent)] bg-[var(--color-accent-light)]"
                            : "border-[var(--color-border)] hover:border-[var(--color-accent)]/50"
                        )}
                      >
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
              ) : merch.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-sm text-[var(--color-text-muted)]">Sin productos de merch aún.</p>
                  <a href="/libros?tab=merchandising" onClick={handleClose}
                    className="text-sm font-medium text-[var(--color-accent)] hover:underline mt-1 block">
                    Agregar producto →
                  </a>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Producto</label>
                  <div className="space-y-1.5">
                    {merch.map(m => (
                      <label key={m.id} className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] border cursor-pointer transition-colors",
                        merchId === m.id
                          ? "border-[var(--color-accent)] bg-[var(--color-accent-light)]"
                          : "border-[var(--color-border)] hover:border-[var(--color-accent)]/50"
                      )}>
                        <input type="radio" name="merch" value={m.id} checked={merchId === m.id} onChange={() => setMerchId(m.id)} className="accent-[var(--color-accent)]" />
                        <ShoppingBag size={13} className="text-[var(--color-text-muted)] shrink-0" />
                        <span className="text-sm text-[var(--color-text)]">{m.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Qty + price */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Cantidad</label>
                  <div className="flex items-center border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden">
                    <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-3 py-2 text-[var(--color-text-muted)] hover:bg-[var(--color-accent-light)] hover:text-[var(--color-accent)] transition-colors">
                      <Minus size={14} />
                    </button>
                    <span className="flex-1 text-center text-sm font-semibold">{quantity}</span>
                    <button type="button" onClick={() => setQuantity(quantity + 1)} className="px-3 py-2 text-[var(--color-text-muted)] hover:bg-[var(--color-accent-light)] hover:text-[var(--color-accent)] transition-colors">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Precio unit.</label>
                  <Input
                    type="number" min="0" step="1" inputMode="numeric"
                    value={unitPrice}
                    onChange={e => setUnitPrice(e.target.value)}
                    placeholder="8000"
                    required
                    className="text-sm"
                  />
                </div>
              </div>

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
                      <input type="radio" name="channel" value={c.id} checked={channelId === c.id} onChange={() => setChannelId(c.id)} className="accent-[var(--color-accent)]" />
                      <span className="text-sm text-[var(--color-text)]">{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Payment method */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Pago</label>
                <div className="flex gap-2">
                  {PAYMENT_METHODS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPayment(value)}
                      className={cn(
                        "flex-1 px-2 py-2 rounded-[var(--radius-md)] border text-xs font-medium transition-colors",
                        payment === value
                          ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]"
                          : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">Total</p>
                <p className="text-xl font-semibold text-[var(--color-text)]" style={{ fontFamily: "var(--font-heading)" }}>
                  {formatMoney(total)}
                </p>
              </div>
              <Button
                type="submit"
                disabled={isPending || !channelId || !unitPrice || parseFloat(unitPrice) < 0 || (mode === "merch" && !hasItems)}
                className="px-6"
              >
                {isPending ? "Registrando..." : "Registrar venta"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
