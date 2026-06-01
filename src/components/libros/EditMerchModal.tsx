"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateMerchandise } from "@/actions/merchandise";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MerchandiseType } from "@/generated/prisma/client";

const CATEGORIES = ["Ropa", "Accesorios", "Papelería", "Coleccionables", "Set", "Otro"];

type MerchData = {
  id: string;
  name: string;
  type: MerchandiseType;
  suggestedPrice: number | null;
  category: string | null;
  bookId: string | null;
  edition: string | null;
  components: string[] | null;
  sku: string | null;
  description: string | null;
  isActive: boolean;
};

type BookOption = { id: string; title: string };

export default function EditMerchModal({
  merch,
  books,
}: {
  merch: MerchData;
  books: BookOption[];
}) {
  const [open, setOpen]             = useState(false);
  const [name, setName]             = useState(merch.name);
  const [type, setType]             = useState<MerchandiseType>(merch.type);
  const [price, setPrice]           = useState(merch.suggestedPrice?.toFixed(0) ?? "");
  const [category, setCategory]     = useState(merch.category ?? "");
  const [bookId, setBookId]         = useState(merch.bookId ?? "");
  const [edition, setEdition]       = useState(merch.edition ?? "");
  const [components, setComponents] = useState((merch.components as string[] | null)?.join("\n") ?? "");
  const [sku, setSku]               = useState(merch.sku ?? "");
  const [description, setDescription] = useState(merch.description ?? "");
  const [isActive, setIsActive]     = useState(merch.isActive);
  const [error, setError]           = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleOpen() {
    setName(merch.name); setType(merch.type);
    setPrice(merch.suggestedPrice?.toFixed(0) ?? "");
    setCategory(merch.category ?? ""); setBookId(merch.bookId ?? "");
    setEdition(merch.edition ?? "");
    setComponents((merch.components as string[] | null)?.join("\n") ?? "");
    setSku(merch.sku ?? ""); setDescription(merch.description ?? "");
    setIsActive(merch.isActive); setError(null);
    setOpen(true);
  }

  function handleClose() {
    if (isPending) return;
    setOpen(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const compArray = type === "BUNDLE"
      ? components.split("\n").map(s => s.trim()).filter(Boolean)
      : undefined;
    startTransition(async () => {
      const result = await updateMerchandise({
        id:             merch.id,
        name,
        type,
        isActive,
        suggestedPrice: price ? parseFloat(price) : undefined,
        category:       category || undefined,
        bookId:         bookId   || undefined,
        edition:        type === "BUNDLE" ? (edition || undefined) : undefined,
        components:     compArray,
        sku:            sku         || undefined,
        description:    description || undefined,
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
        title="Editar producto"
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
                Editar producto
              </h2>
              <button onClick={handleClose} disabled={isPending} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-merch-name">
                  Nombre <span className="text-[var(--color-danger)]">*</span>
                </Label>
                <Input
                  id="edit-merch-name"
                  value={name}
                  onChange={e => setName(e.target.value)}
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
                  <Label htmlFor="edit-merch-price">Precio sugerido</Label>
                  <Input
                    id="edit-merch-price"
                    type="number" min="0" step="1" inputMode="numeric"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    placeholder="5000"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Categoría</Label>
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-merch-sku">SKU</Label>
                  <Input id="edit-merch-sku" value={sku} onChange={e => setSku(e.target.value)} placeholder="SKU-001" />
                </div>
                {books.length > 0 && (
                  <div className="space-y-1.5">
                    <Label>Libro asociado</Label>
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
              </div>

              {type === "BUNDLE" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-merch-edition">Edición</Label>
                    <Input id="edit-merch-edition" value={edition} onChange={e => setEdition(e.target.value)} placeholder="Edición especial de lanzamiento" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-merch-components">
                      Componentes{" "}
                      <span className="text-xs font-normal text-[var(--color-text-muted)]">(un ítem por línea)</span>
                    </Label>
                    <textarea
                      id="edit-merch-components"
                      value={components}
                      onChange={e => setComponents(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)] resize-none"
                    />
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="edit-merch-desc">Descripción</Label>
                <Input id="edit-merch-desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Notas internas o descripción del producto" />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                  className="accent-[var(--color-accent)]"
                />
                <span className="text-sm text-[var(--color-text)]">Producto activo</span>
                <span className="text-xs text-[var(--color-text-muted)]">(desmarcar para discontinuar)</span>
              </label>

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
