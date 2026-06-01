"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createExpense } from "@/actions/expenses";
import { ExpenseCategory, ExpenseLevel } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORY_OPTIONS: { value: ExpenseCategory; label: string }[] = [
  { value: "PRINT",                 label: "Impresión de libros"      },
  { value: "DESIGN_ART",            label: "Diseño y arte"            },
  { value: "EDITING",               label: "Edición y corrección"     },
  { value: "MERCHANDISE_PRODUCTION",label: "Producción de merch"      },
  { value: "SOCIAL_ADS",            label: "Publicidad en redes"      },
  { value: "EVENTS",                label: "Ferias y eventos"         },
  { value: "MARKETING_OTHER",       label: "Marketing — otros"        },
  { value: "SHIPPING",              label: "Envíos y logística"       },
  { value: "PLATFORMS_SOFTWARE",    label: "Plataformas y software"   },
  { value: "OTHER",                 label: "Otros"                    },
];

type BookWithRuns = {
  id: string;
  title: string;
  printRuns: { id: string; quantity: number; receivedAt: Date }[];
};

export default function AddExpenseModal({
  accountId,
  currency,
  books,
}: {
  accountId: string;
  currency: string;
  books: BookWithRuns[];
}) {
  const today = new Date().toISOString().split("T")[0];

  const [open, setOpen]               = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount]           = useState("");
  const [category, setCategory]       = useState<ExpenseCategory>("OTHER");
  const [level, setLevel]             = useState<ExpenseLevel>("GENERAL");
  const [bookId, setBookId]           = useState("");
  const [printRunId, setPrintRunId]   = useState("");
  const [occurredAt, setOccurredAt]   = useState(today);
  const [notes, setNotes]             = useState("");
  const [error, setError]             = useState<string | null>(null);
  const [isPending, startTransition]  = useTransition();
  const router = useRouter();

  const selectedBook = books.find(b => b.id === bookId);

  function handleClose() {
    if (isPending) return;
    setOpen(false);
    setDescription(""); setAmount(""); setCategory("OTHER"); setLevel("GENERAL");
    setBookId(""); setPrintRunId(""); setOccurredAt(today); setNotes(""); setError(null);
  }

  function handleLevelChange(l: ExpenseLevel) {
    setLevel(l);
    if (l === "GENERAL") { setBookId(""); setPrintRunId(""); }
    if (l === "BOOK") setPrintRunId("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createExpense({
        accountId,
        description,
        amount:      parseFloat(amount),
        currency,
        category,
        level,
        bookId:     bookId     || undefined,
        printRunId: printRunId || undefined,
        occurredAt,
        notes:      notes      || undefined,
      });
      if (result.error) setError(result.error);
      else { handleClose(); router.refresh(); }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm" className="gap-1.5">
        <Plus size={14} />
        Registrar gasto
      </Button>

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
                Registrar gasto
              </h2>
              <button onClick={handleClose} disabled={isPending} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="exp-desc">Descripción <span className="text-[var(--color-danger)]">*</span></Label>
                <Input id="exp-desc" value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Ej. Diseño de portada segunda edición" required autoFocus />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="exp-amount">Monto <span className="text-[var(--color-danger)]">*</span></Label>
                  <Input id="exp-amount" type="number" min="0" step="1" inputMode="numeric"
                    value={amount} onChange={e => setAmount(e.target.value)}
                    placeholder="80000" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="exp-date">Fecha</Label>
                  <Input id="exp-date" type="date" value={occurredAt} onChange={e => setOccurredAt(e.target.value)} max={today} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Categoría</Label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)]"
                >
                  {CATEGORY_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>¿A qué corresponde?</Label>
                <div className="flex gap-2">
                  {(["GENERAL", "BOOK", "PRINT_RUN"] as ExpenseLevel[]).map(l => (
                    <button key={l} type="button" onClick={() => handleLevelChange(l)}
                      className={cn(
                        "flex-1 py-2 rounded-[var(--radius-md)] border text-xs font-medium transition-colors",
                        level === l
                          ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]"
                          : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]"
                      )}>
                      {l === "GENERAL" ? "General" : l === "BOOK" ? "Un libro" : "Una tirada"}
                    </button>
                  ))}
                </div>
              </div>

              {(level === "BOOK" || level === "PRINT_RUN") && books.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Libro</Label>
                  <select
                    value={bookId}
                    onChange={e => { setBookId(e.target.value); setPrintRunId(""); }}
                    className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)]"
                  >
                    <option value="">Selecciona un libro</option>
                    {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                  </select>
                </div>
              )}

              {level === "PRINT_RUN" && selectedBook?.printRuns.length && (
                <div className="space-y-1.5">
                  <Label>Tirada</Label>
                  <select
                    value={printRunId}
                    onChange={e => setPrintRunId(e.target.value)}
                    className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)]"
                  >
                    <option value="">Selecciona una tirada</option>
                    {selectedBook.printRuns.map((r, i) => (
                      <option key={r.id} value={r.id}>
                        Tirada #{selectedBook.printRuns.length - i} — {r.quantity} ej. · {new Date(r.receivedAt).toLocaleDateString("es-CL")}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="exp-notes">Notas <span className="text-xs font-normal text-[var(--color-text-muted)]">(opcional)</span></Label>
                <Input id="exp-notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Proveedor, referencia, etc." />
              </div>

              {error && (
                <p className="text-sm text-[var(--color-danger)] bg-[var(--color-danger)]/8 rounded-[var(--radius-sm)] px-3 py-2">{error}</p>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>Cancelar</Button>
                <Button type="submit" disabled={isPending || !description.trim() || !amount}>
                  {isPending ? "Guardando..." : "Registrar gasto"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
