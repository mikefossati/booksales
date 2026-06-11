"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createExpense } from "@/actions/expenses";
import { toast } from "sonner";
import { Plus, X, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useModalA11y } from "@/hooks/useModalA11y";
import { todayLocal } from "@/lib/dates";
import type { ExpenseCategory } from "@/generated/prisma/client";

type Book = { id: string; title: string; coverUrl: string | null };

const CATEGORIES: { value: ExpenseCategory; emoji: string; label: string; full: string }[] = [
  { value: "SHIPPING",               emoji: "📦", label: "Envíos",      full: "Envíos y logística"    },
  { value: "EVENTS",                 emoji: "🎪", label: "Ferias",      full: "Ferias y eventos"       },
  { value: "SOCIAL_ADS",             emoji: "📢", label: "Publicidad",  full: "Publicidad en redes"    },
  { value: "DESIGN_ART",             emoji: "🎨", label: "Diseño",      full: "Diseño y arte"          },
  { value: "PRINT",                  emoji: "📖", label: "Impresión",   full: "Impresión de libros"    },
  { value: "EDITING",                emoji: "✂️",  label: "Edición",     full: "Edición y corrección"   },
  { value: "MERCHANDISE_PRODUCTION", emoji: "🛍️",  label: "Prod. merch", full: "Producción de merch"    },
  { value: "PLATFORMS_SOFTWARE",     emoji: "💻", label: "Software",    full: "Plataformas y software" },
  { value: "MARKETING_OTHER",        emoji: "🏷️",  label: "Marketing",   full: "Marketing — otros"      },
  { value: "OTHER",                  emoji: "💬", label: "Otros",       full: "Otros"                  },
];

export default function DashboardExpenseButton({
  accountId,
  currency,
  books,
}: {
  accountId: string;
  currency: string;
  books: Book[];
}) {
  const [open, setOpen]                   = useState(false);
  const [category, setCategory]           = useState<ExpenseCategory>("SHIPPING");
  const [description, setDescription]     = useState("");
  const [amount, setAmount]               = useState("");
  const [level, setLevel]                 = useState<"GENERAL" | "BOOK">("GENERAL");
  const [bookId, setBookId]               = useState("");
  const [expDate, setExpDate]             = useState(todayLocal());
  const [isPending, startTransition]      = useTransition();
  const panelRef = useModalA11y<HTMLFormElement>(open, () => { if (!isPending) setOpen(false); });
  const router = useRouter();

  // Restore last used category
  useEffect(() => {
    try {
      const saved = localStorage.getItem("lastExpenseCategory") as ExpenseCategory | null;
      if (saved && CATEGORIES.some(c => c.value === saved)) setCategory(saved);
    } catch {}
  }, []);

  // Auto-fill description when category changes
  useEffect(() => {
    const cat = CATEGORIES.find(c => c.value === category);
    if (cat) setDescription(cat.full);
  }, [category]);

  function handleCategorySelect(cat: ExpenseCategory) {
    setCategory(cat);
    try { localStorage.setItem("lastExpenseCategory", cat); } catch {}
  }

  function handleOpen() {
    setAmount(""); setLevel("GENERAL"); setBookId(""); setExpDate(todayLocal());
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim() || !amount) return;
    startTransition(async () => {
      const cat = CATEGORIES.find(c => c.value === category);
      const result = await createExpense({
        accountId,
        description: description.trim() || (cat?.full ?? "Gasto"),
        amount:      parseFloat(amount),
        currency,
        category,
        level:       level === "BOOK" && bookId ? "BOOK" : "GENERAL",
        bookId:      level === "BOOK" && bookId ? bookId : undefined,
        occurredAt:  expDate,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        const fmt = new Intl.NumberFormat("es-CL", { style: "currency", currency, maximumFractionDigits: 0 }).format(parseFloat(amount));
        toast.success(`Gasto registrado — ${fmt} en ${cat?.label ?? "gastos"}`);
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-medium transition-opacity hover:opacity-90"
        style={{ backgroundColor: "var(--color-warning)", color: "white" }}
      >
        <Plus size={12} />
        Gasto
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
            aria-label="Registrar gasto"
            onSubmit={handleSubmit}
            className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] w-full max-w-sm shadow-xl overflow-hidden max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] shrink-0">
              <h2 className="text-lg font-semibold text-[var(--color-text)] font-heading">
                Registrar gasto
              </h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="p-2 -m-2 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {/* Category */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Categoría</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {CATEGORIES.map(cat => (
                    <button key={cat.value} type="button" onClick={() => handleCategorySelect(cat.value)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border text-xs font-medium transition-colors text-left",
                        category === cat.value
                          ? "bg-[var(--color-warning)]/15 border-[var(--color-warning)] text-[var(--color-text)]"
                          : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-warning)]/50"
                      )}>
                      <span aria-hidden="true">{cat.emoji}</span>
                      <span className="truncate">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Descripción</label>
                <Input value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Descripción del gasto" required className="text-sm" />
              </div>

              {/* Amount + date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Monto</label>
                  <Input type="number" min="1" step="1" inputMode="numeric"
                    value={amount} onChange={e => setAmount(e.target.value)}
                    placeholder="15000" required className="text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="de-exp-date" className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Fecha</label>
                  <Input id="de-exp-date" type="date"
                    value={expDate} onChange={e => setExpDate(e.target.value)}
                    max={todayLocal()} required className="text-sm" />
                </div>
              </div>

              {/* Book assignment */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">¿Corresponde a un libro?</p>
                <div className="flex gap-2">
                  {(["GENERAL", "BOOK"] as const).map(lvl => (
                    <button key={lvl} type="button"
                      onClick={() => { setLevel(lvl); if (lvl === "GENERAL") setBookId(""); }}
                      className={cn(
                        "flex-1 py-2 rounded-[var(--radius-md)] border text-xs font-medium transition-colors",
                        level === lvl
                          ? "bg-[var(--color-warning)]/15 border-[var(--color-warning)] text-[var(--color-text)]"
                          : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-warning)]/50"
                      )}>
                      {lvl === "GENERAL" ? "No (general)" : "Sí →"}
                    </button>
                  ))}
                </div>

                {level === "BOOK" && books.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 pt-1">
                    {books.map(b => (
                      <button key={b.id} type="button" onClick={() => setBookId(b.id)}
                        className={cn(
                          "shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-[var(--radius-md)] border-2 transition-colors w-20",
                          bookId === b.id
                            ? "border-[var(--color-warning)] bg-[var(--color-warning)]/10"
                            : "border-[var(--color-border)] hover:border-[var(--color-warning)]/50"
                        )}>
                        <div className="w-12 h-16 rounded bg-[var(--color-accent-light)] flex items-center justify-center overflow-hidden">
                          {b.coverUrl
                            ? <img src={b.coverUrl} alt={b.title} width={48} height={64} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                            : <BookOpen size={16} className="text-[var(--color-accent)] opacity-50" />}
                        </div>
                        <span className="text-[11px] text-[var(--color-text)] line-clamp-2 text-center leading-tight">{b.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 pb-5 pt-3 flex items-center justify-between gap-3 border-t border-[var(--color-border)] shrink-0">
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">Monto</p>
                <p className="text-xl font-semibold text-[var(--color-text)] font-heading">
                  {amount
                    ? new Intl.NumberFormat("es-CL", { style: "currency", currency, maximumFractionDigits: 0 }).format(parseFloat(amount) || 0)
                    : "—"}
                </p>
              </div>
              <Button type="submit" disabled={isPending || !amount || parseFloat(amount) <= 0 || !description.trim()}
                style={{ backgroundColor: "var(--color-warning)", borderColor: "var(--color-warning)" }}>
                {isPending ? "Guardando…" : "Registrar"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
