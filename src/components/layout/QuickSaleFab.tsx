"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSale } from "@/actions/sales";
import { createMerchSale } from "@/actions/merchandise";
import { createExpense } from "@/actions/expenses";
import { toast } from "sonner";
import { Plus, X, BookOpen, ShoppingBag, Minus, ChevronRight, Receipt, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { fetchRateToCLP } from "@/lib/fx";
import { todayLocal } from "@/lib/dates";
import { useModalA11y } from "@/hooks/useModalA11y";
import type { ExpenseCategory } from "@/generated/prisma/client";

type Book    = { id: string; title: string; coverUrl: string | null };
type Merch   = { id: string; name: string };
type Channel = { id: string; name: string; type: string; currency: string | null };

const PAYMENT_METHODS = [
  { value: "Efectivo",      label: "💵 Efectivo" },
  { value: "Transferencia", label: "📱 Transf."  },
  { value: "Tarjeta",       label: "💳 Tarjeta"  },
];

const QUICK_CATEGORIES: { value: ExpenseCategory; emoji: string; label: string; full: string }[] = [
  { value: "SHIPPING",               emoji: "📦", label: "Envíos",      full: "Envíos y logística"     },
  { value: "EVENTS",                 emoji: "🎪", label: "Ferias",      full: "Ferias y eventos"        },
  { value: "SOCIAL_ADS",             emoji: "📢", label: "Publicidad",  full: "Publicidad en redes"     },
  { value: "DESIGN_ART",             emoji: "🎨", label: "Diseño",      full: "Diseño y arte"           },
  { value: "PRINT",                  emoji: "📖", label: "Impresión",   full: "Impresión de libros"     },
  { value: "EDITING",                emoji: "✂️",  label: "Edición",     full: "Edición y corrección"    },
  { value: "MERCHANDISE_PRODUCTION", emoji: "🛍️",  label: "Prod. merch", full: "Producción de merch"     },
  { value: "PLATFORMS_SOFTWARE",     emoji: "💻", label: "Software",    full: "Plataformas y software"  },
  { value: "MARKETING_OTHER",        emoji: "🏷️",  label: "Marketing",   full: "Marketing — otros"       },
  { value: "OTHER",                  emoji: "💬", label: "Otros",       full: "Otros"                   },
];

export default function QuickSaleFab({
  accountId,
  accountCurrency,
  books,
  merch,
  channels,
  lastPrices = {},
  merchLastPrices = {},
}: {
  accountId: string;
  accountCurrency: string;
  books: Book[];
  merch: Merch[];
  channels: Channel[];
  lastPrices?: Record<string, number>;
  merchLastPrices?: Record<string, number>;
}) {
  const [open, setOpen]           = useState(false);
  const [mode, setMode]           = useState<"libro" | "merch" | "gasto">("libro");

  // ── Sale state ──────────────────────────────────────────────────────────────
  const [bookId, setBookId]       = useState(books[0]?.id ?? "");
  const [merchId, setMerchId]     = useState(merch[0]?.id ?? "");
  const [channelId, setChannelId] = useState(channels[0]?.id ?? "");
  const [quantity, setQuantity]   = useState(1);
  const [unitPrice, setUnitPrice] = useState("");
  const [payment, setPayment]     = useState("Efectivo");
  const [saleDate, setSaleDate]   = useState(todayLocal());
  const [fxRate, setFxRate]       = useState("");
  const [fxLoading, setFxLoading] = useState(false);

  // ── Expense state ───────────────────────────────────────────────────────────
  const [expCategory, setExpCategory] = useState<ExpenseCategory>("SHIPPING");
  const [expDescription, setExpDescription] = useState("");
  const [expAmount, setExpAmount]     = useState("");
  const [expLevel, setExpLevel]       = useState<"GENERAL" | "BOOK">("GENERAL");
  const [expBookId, setExpBookId]     = useState("");
  const [expDate, setExpDate]         = useState(todayLocal());

  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Restore last used expense category from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("lastExpenseCategory") as ExpenseCategory | null;
      if (saved && QUICK_CATEGORIES.some(c => c.value === saved)) setExpCategory(saved);
    } catch {}
  }, []);

  // Auto-fill description when category changes
  useEffect(() => {
    const cat = QUICK_CATEGORIES.find(c => c.value === expCategory);
    if (cat) setExpDescription(cat.full);
  }, [expCategory]);

  // Fetch FX rate when channel currency or sale date changes.
  // Backdated sales use the historical rate for that day.
  useEffect(() => {
    const currency = channels.find(c => c.id === channelId)?.currency ?? "CLP";
    if (currency === accountCurrency) { setFxRate(""); return; }

    setFxLoading(true);
    fetchRateToCLP(currency, saleDate !== todayLocal() ? saleDate : undefined)
      .then(rate => { if (rate) setFxRate(rate.toFixed(4)); })
      .catch(() => {})
      .finally(() => setFxLoading(false));
  }, [channelId, saleDate]);

  // Pre-fill sale price when book / channel selection changes
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
  const saleCurrency    = selectedChannel?.currency ?? "CLP";
  const needsFx         = saleCurrency !== accountCurrency;
  const total           = quantity * (parseFloat(unitPrice) || 0);
  const totalCLP        = needsFx && fxRate ? total * parseFloat(fxRate) : total;

  function formatMoney(n: number, curr = accountCurrency) {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: curr, maximumFractionDigits: 0 }).format(n);
  }

  function handleOpen() {
    const b0 = books[0]?.id ?? "";
    const m0 = merch[0]?.id ?? "";
    const c0 = channels[0]?.id ?? "";
    setMode("libro");
    setBookId(b0); setMerchId(m0); setChannelId(c0);
    setQuantity(1); setPayment("Efectivo"); setSaleDate(todayLocal());
    setUnitPrice(b0 && c0 ? (lastPrices[`${b0}_${c0}`]?.toFixed(0) ?? "") : "");
    setFxRate(""); setFxLoading(false);
    setExpAmount(""); setExpLevel("GENERAL"); setExpBookId(""); setExpDate(todayLocal());
    setOpen(true);
  }

  const panelRef = useModalA11y<HTMLFormElement>(open, handleClose);

  function handleClose() {
    if (isPending) return;
    setOpen(false);
  }

  function handleCategorySelect(cat: ExpenseCategory) {
    setExpCategory(cat);
    try { localStorage.setItem("lastExpenseCategory", cat); } catch {}
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    startTransition(async () => {
      if (mode === "gasto") {
        const cat = QUICK_CATEGORIES.find(c => c.value === expCategory);
        const result = await createExpense({
          accountId,
          description: expDescription.trim() || (cat?.full ?? "Gasto"),
          amount:      parseFloat(expAmount),
          currency:    accountCurrency,
          category:    expCategory,
          level:       expLevel === "BOOK" && expBookId ? "BOOK" : "GENERAL",
          bookId:      expLevel === "BOOK" && expBookId ? expBookId : undefined,
          occurredAt:  expDate,
        });
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success(`Gasto registrado — ${formatMoney(parseFloat(expAmount))} en ${cat?.label ?? "gastos"}`);
          handleClose();
          router.refresh();
        }
        return;
      }

      let result: { error?: string };
      const fxRateToCLP = needsFx && fxRate ? parseFloat(fxRate) : undefined;

      if (mode === "libro") {
        if (!bookId) return;
        result = await createSale({ bookId, channelId, quantity, unitPrice: parseFloat(unitPrice), currency: saleCurrency, fxRateToCLP, paymentMethod: payment, saleDate });
      } else {
        if (!merchId) return;
        result = await createMerchSale({ merchandiseId: merchId, channelId, quantity, unitPrice: parseFloat(unitPrice), currency: saleCurrency, fxRateToCLP, paymentMethod: payment, saleDate });
      }

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Venta registrada — ${formatMoney(total, saleCurrency)} sumados`);
        handleClose();
        router.refresh();
      }
    });
  }

  const saleMissingSetup = channels.length === 0 || (mode === "libro" && books.length === 0);

  return (
    <>
      <button
        onClick={handleOpen}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 w-14 h-14 rounded-full bg-[var(--color-accent)] text-white shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-40"
        aria-label="Registrar venta o gasto"
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
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Registrar venta o gasto"
            onSubmit={handleSubmit}
            className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] w-full max-w-sm shadow-xl overflow-hidden max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] shrink-0">
              <h2 className="text-lg font-semibold text-[var(--color-text)]" style={{ fontFamily: "var(--font-heading)" }}>
                Registrar
              </h2>
              <button type="button" onClick={handleClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                <X size={18} />
              </button>
            </div>

            {/* Mode tabs */}
            <div className="px-5 pt-4 pb-1 shrink-0">
              <div className="flex gap-2">
                {([
                  { value: "libro", label: "Libro",  Icon: BookOpen    },
                  { value: "merch", label: "Merch",  Icon: ShoppingBag },
                  { value: "gasto", label: "Gasto",  Icon: Receipt     },
                ] as { value: "libro" | "merch" | "gasto"; label: string; Icon: React.ElementType }[]).map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setMode(value);
                      if (value !== "gasto") { setQuantity(1); setUnitPrice(""); }
                    }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[var(--radius-md)] border text-xs font-medium transition-colors",
                      mode === value
                        ? value === "gasto"
                          ? "bg-[var(--color-warning)] text-white border-[var(--color-warning)]"
                          : "bg-[var(--color-accent)] text-white border-[var(--color-accent)]"
                        : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]"
                    )}
                  >
                    <Icon size={13} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1">

              {/* ── GASTO ───────────────────────────────────────────────────── */}
              {mode === "gasto" && (
                <div className="p-5 space-y-4">
                  {/* Category grid */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Categoría</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {QUICK_CATEGORIES.map(cat => (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => handleCategorySelect(cat.value)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border text-xs font-medium transition-colors text-left",
                            expCategory === cat.value
                              ? "bg-[var(--color-warning)]/15 border-[var(--color-warning)] text-[var(--color-text)]"
                              : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-warning)]/50"
                          )}
                        >
                          <span>{cat.emoji}</span>
                          <span className="truncate">{cat.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
                      Descripción
                    </label>
                    <Input
                      value={expDescription}
                      onChange={e => setExpDescription(e.target.value)}
                      placeholder="Descripción del gasto"
                      required
                      className="text-sm"
                    />
                  </div>

                  {/* Amount + date */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
                        Monto
                      </label>
                      <Input
                        type="number" min="1" step="1" inputMode="numeric"
                        value={expAmount}
                        onChange={e => setExpAmount(e.target.value)}
                        placeholder="15000"
                        required
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="quick-exp-date" className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
                        Fecha
                      </label>
                      <Input
                        id="quick-exp-date"
                        type="date"
                        value={expDate}
                        onChange={e => setExpDate(e.target.value)}
                        max={todayLocal()}
                        required
                        className="text-sm"
                      />
                    </div>
                  </div>

                  {/* Book assignment */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
                      ¿Corresponde a un libro?
                    </p>
                    <div className="flex gap-2">
                      {(["GENERAL", "BOOK"] as const).map(lvl => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => { setExpLevel(lvl); if (lvl === "GENERAL") setExpBookId(""); }}
                          className={cn(
                            "flex-1 py-2 rounded-[var(--radius-md)] border text-xs font-medium transition-colors",
                            expLevel === lvl
                              ? "bg-[var(--color-warning)]/15 border-[var(--color-warning)] text-[var(--color-text)]"
                              : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-warning)]/50"
                          )}
                        >
                          {lvl === "GENERAL" ? "No (general)" : "Sí →"}
                        </button>
                      ))}
                    </div>

                    {expLevel === "BOOK" && books.length === 0 && (
                      <p className="text-xs text-[var(--color-text-muted)]">No hay libros registrados aún.</p>
                    )}

                    {expLevel === "BOOK" && books.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-1 pt-1">
                        {books.map(b => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setExpBookId(b.id)}
                            className={cn(
                              "shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-[var(--radius-md)] border-2 transition-colors w-20",
                              expBookId === b.id
                                ? "border-[var(--color-warning)] bg-[var(--color-warning)]/10"
                                : "border-[var(--color-border)] hover:border-[var(--color-warning)]/50"
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
                    )}
                  </div>
                </div>
              )}

              {/* ── LIBRO / MERCH ────────────────────────────────────────────── */}
              {mode !== "gasto" && (
                <>
                  {saleMissingSetup ? (
                    <div className="p-5 space-y-3 py-6">
                      {books.length === 0 && (
                        <a href="/libros" onClick={handleClose}
                          className="flex items-center justify-between p-3 rounded-[var(--radius-md)] bg-[var(--color-accent-light)] text-[var(--color-accent)] text-sm font-medium">
                          <span>① Agrega al menos un libro</span>
                          <ChevronRight size={15} />
                        </a>
                      )}
                      {channels.length === 0 && (
                        <a href="/configuracion" onClick={handleClose}
                          className="flex items-center justify-between p-3 rounded-[var(--radius-md)] bg-[var(--color-accent-light)] text-[var(--color-accent)] text-sm font-medium">
                          <span>② Configura al menos un canal</span>
                          <ChevronRight size={15} />
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="p-5 space-y-5">
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
                                <input type="radio" name="merch" value={m.id} checked={merchId === m.id}
                                  onChange={() => setMerchId(m.id)} className="accent-[var(--color-accent)]" />
                                <ShoppingBag size={13} className="text-[var(--color-text-muted)] shrink-0" />
                                <span className="text-sm text-[var(--color-text)]">{m.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Qty + price */}
                      {(mode === "libro" || merch.length > 0) && (
                        <>
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

                          {/* Sale date — editable to register past sales */}
                          <div className="space-y-1.5">
                            <label htmlFor="quick-sale-date" className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Fecha</label>
                            <Input
                              id="quick-sale-date"
                              type="date"
                              value={saleDate}
                              onChange={e => setSaleDate(e.target.value)}
                              max={todayLocal()}
                              required
                              className="text-sm"
                            />
                          </div>

                          {/* FX rate — only shown for foreign-currency channels */}
                          {needsFx && (
                            <div className="space-y-1.5 rounded-[var(--radius-md)] bg-[var(--color-accent-light)]/60 px-3 py-2.5">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
                                  1 {saleCurrency} =
                                </label>
                                {fxLoading && <RefreshCw size={11} className="animate-spin text-[var(--color-text-muted)]" />}
                              </div>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number" min="0" step="0.0001" inputMode="decimal"
                                  value={fxRate}
                                  onChange={e => setFxRate(e.target.value)}
                                  placeholder="0.0000"
                                  required
                                  className="text-sm h-8"
                                />
                                <span className="text-xs font-medium text-[var(--color-text-muted)] shrink-0">CLP</span>
                              </div>
                              {fxRate && total > 0 && (
                                <p className="text-[10px] text-[var(--color-text-muted)]">
                                  ≈ {formatMoney(totalCLP)} CLP total
                                </p>
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
                                  <input type="radio" name="channel" value={c.id} checked={channelId === c.id}
                                    onChange={() => setChannelId(c.id)} className="accent-[var(--color-accent)]" />
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
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {mode === "gasto" ? (
              <div className="px-5 pb-5 pt-3 flex items-center justify-between gap-3 border-t border-[var(--color-border)] shrink-0">
                <div>
                  <p className="text-xs text-[var(--color-text-muted)]">Monto</p>
                  <p className="text-xl font-semibold text-[var(--color-text)]" style={{ fontFamily: "var(--font-heading)" }}>
                    {expAmount ? formatMoney(parseFloat(expAmount) || 0) : "—"}
                  </p>
                </div>
                <Button
                  type="submit"
                  disabled={isPending || !expAmount || parseFloat(expAmount) <= 0 || !expDescription.trim()}
                  style={{ backgroundColor: "var(--color-warning)", borderColor: "var(--color-warning)" }}
                >
                  {isPending ? "Guardando..." : "Registrar gasto"}
                </Button>
              </div>
            ) : !saleMissingSetup && (mode === "libro" || merch.length > 0) ? (
              <div className="px-5 pb-5 pt-3 flex items-center justify-between gap-3 border-t border-[var(--color-border)] shrink-0">
                <div>
                  <p className="text-xs text-[var(--color-text-muted)]">Total</p>
                  <p className="text-xl font-semibold text-[var(--color-text)]" style={{ fontFamily: "var(--font-heading)" }}>
                    {formatMoney(total, saleCurrency)}
                  </p>
                  {needsFx && fxRate && (
                    <p className="text-xs text-[var(--color-text-muted)]">≈ {formatMoney(totalCLP)}</p>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={isPending || !channelId || !unitPrice || parseFloat(unitPrice) < 0 || (needsFx && !fxRate)}
                >
                  {isPending ? "Registrando..." : "Registrar venta"}
                </Button>
              </div>
            ) : null}
          </form>
        </div>
      )}
    </>
  );
}
