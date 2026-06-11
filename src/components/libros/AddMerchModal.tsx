"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMerchandise } from "@/actions/merchandise";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MerchandiseType } from "@/generated/prisma/client";
import { useModalA11y } from "@/hooks/useModalA11y";

const CATEGORIES = ["Ropa", "Accesorios", "Papelería", "Coleccionables", "Set", "Otro"];

type BookOption = { id: string; title: string };

export default function AddMerchModal({
  accountId,
  books,
}: {
  accountId: string;
  books: BookOption[];
}) {
  const [open, setOpen]             = useState(false);
  const [name, setName]             = useState("");
  const [type, setType]             = useState<MerchandiseType>("SIMPLE");
  const [price, setPrice]           = useState("");
  const [category, setCategory]     = useState("");
  const [bookId, setBookId]         = useState("");
  const [edition, setEdition]       = useState("");
  const [components, setComponents] = useState("");
  const [error, setError]           = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const panelRef = useModalA11y<HTMLDivElement>(open, handleClose);

  function handleClose() {
    if (isPending) return;
    setOpen(false);
    setName(""); setType("SIMPLE"); setPrice(""); setCategory("");
    setBookId(""); setEdition(""); setComponents(""); setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const compArray = type === "BUNDLE"
      ? components.split("\n").map(s => s.trim()).filter(Boolean)
      : undefined;
    startTransition(async () => {
      const result = await createMerchandise({
        accountId,
        name,
        type,
        suggestedPrice: price ? parseFloat(price) : undefined,
        category:       category || undefined,
        bookId:         bookId   || undefined,
        edition:        type === "BUNDLE" ? (edition || undefined) : undefined,
        components:     compArray,
      });
      if (result.error) setError(result.error);
      else { handleClose(); router.refresh(); }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm" className="gap-1.5">
        <Plus size={14} />
        Nuevo producto
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "oklch(0% 0 0 / 0.35)", backdropFilter: "blur(4px)" }}
          onClick={handleClose}
        >
          <div
            className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto"
            ref={panelRef} role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] sticky top-0 bg-[var(--color-surface)]">
              <h2 className="text-lg font-semibold text-[var(--color-text)]" style={{ fontFamily: "var(--font-heading)" }}>
                Nuevo producto
              </h2>
              <button onClick={handleClose} disabled={isPending} aria-label="Cerrar" className="p-2 -m-2 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="merch-name">
                  Nombre <span className="text-[var(--color-danger)]">*</span>
                </Label>
                <Input
                  id="merch-name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Tote bag, Set de lanzamiento…"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <div className="flex gap-2">
                  {(["SIMPLE", "BUNDLE"] as MerchandiseType[]).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={cn(
                        "flex-1 py-2 rounded-[var(--radius-md)] border text-xs font-medium transition-colors",
                        type === t
                          ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]"
                          : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]"
                      )}
                    >
                      {t === "SIMPLE" ? "Simple" : "Bundle / Set"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="merch-price">
                    Precio sugerido{" "}
                    <span className="text-xs font-normal text-[var(--color-text-muted)]">(opcional)</span>
                  </Label>
                  <Input
                    id="merch-price"
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    placeholder="5000"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>
                    Categoría{" "}
                    <span className="text-xs font-normal text-[var(--color-text-muted)]">(opcional)</span>
                  </Label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)]"
                  >
                    <option value="">— Sin categoría —</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {books.length > 0 && (
                <div className="space-y-1.5">
                  <Label>
                    Libro asociado{" "}
                    <span className="text-xs font-normal text-[var(--color-text-muted)]">(opcional)</span>
                  </Label>
                  <select
                    value={bookId}
                    onChange={e => setBookId(e.target.value)}
                    className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)]"
                  >
                    <option value="">— Sin libro —</option>
                    {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                  </select>
                </div>
              )}

              {type === "BUNDLE" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="merch-edition">
                      Edición{" "}
                      <span className="text-xs font-normal text-[var(--color-text-muted)]">(opcional)</span>
                    </Label>
                    <Input
                      id="merch-edition"
                      value={edition}
                      onChange={e => setEdition(e.target.value)}
                      placeholder="Edición especial de lanzamiento"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="merch-components">
                      Componentes{" "}
                      <span className="text-xs font-normal text-[var(--color-text-muted)]">(un ítem por línea, opcional)</span>
                    </Label>
                    <textarea
                      id="merch-components"
                      value={components}
                      onChange={e => setComponents(e.target.value)}
                      placeholder={"Libro firmado\nTote bag\nSticker exclusivo"}
                      rows={3}
                      className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)] resize-none"
                    />
                  </div>
                </>
              )}

              {error && (
                <p className="text-sm text-[var(--color-danger)] bg-[var(--color-danger)]/8 rounded-[var(--radius-sm)] px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending || !name.trim()}>
                  {isPending ? "Guardando..." : "Crear producto"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
