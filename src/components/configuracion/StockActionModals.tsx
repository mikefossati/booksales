"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { transferStock, adjustStock } from "@/actions/inventories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeftRight, Calculator, X } from "lucide-react";
import { useModalA11y } from "@/hooks/useModalA11y";

type Option = { id: string; name: string };

function Select({
  id, value, onChange, options, placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder: string;
}) {
  return (
    <select
      id={id} value={value} onChange={e => onChange(e.target.value)} required
      className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)]"
    >
      <option value="" disabled>{placeholder}</option>
      {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
    </select>
  );
}

// ── Transfer ──────────────────────────────────────────────────────────────────

export function TransferStockModal({ books, inventories }: { books: Option[]; inventories: Option[] }) {
  const [open, setOpen]         = useState(false);
  const [bookId, setBookId]     = useState("");
  const [fromId, setFromId]     = useState("");
  const [toId, setToId]         = useState("");
  const [quantity, setQuantity] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClose() {
    if (isPending) return;
    setOpen(false); setError(null);
  }
  const panelRef = useModalA11y<HTMLFormElement>(open, handleClose);

  function handleOpen() {
    setBookId(books[0]?.id ?? ""); setFromId(""); setToId(""); setQuantity("");
    setError(null); setOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await transferStock({
        bookId, fromInventoryId: fromId, toInventoryId: toId,
        quantity: parseInt(quantity, 10),
      });
      if (result.error) setError(result.error);
      else { setOpen(false); router.refresh(); }
    });
  }

  return (
    <>
      <Button onClick={handleOpen} size="sm" variant="outline" className="gap-1.5">
        <ArrowLeftRight size={14} />
        Transferir
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "oklch(0% 0 0 / 0.35)", backdropFilter: "blur(4px)" }}
          onClick={handleClose}
        >
          <form
            ref={panelRef} role="dialog" aria-modal="true" aria-label="Transferir existencias"
            onSubmit={handleSubmit}
            className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] w-full max-w-sm shadow-xl p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--color-text)]" style={{ fontFamily: "var(--font-heading)" }}>
                Transferir existencias
              </h2>
              <button type="button" onClick={handleClose} aria-label="Cerrar" className="p-2 -m-2 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tr-book">Libro</Label>
              <Select id="tr-book" value={bookId} onChange={setBookId} options={books} placeholder="Selecciona un libro" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tr-from">Desde</Label>
                <Select id="tr-from" value={fromId} onChange={setFromId} options={inventories} placeholder="Origen" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tr-to">Hacia</Label>
                <Select id="tr-to" value={toId} onChange={setToId}
                  options={inventories.filter(i => i.id !== fromId)} placeholder="Destino" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tr-qty">Cantidad</Label>
              <Input id="tr-qty" type="number" min="1" step="1" inputMode="numeric"
                value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="10" required />
            </div>

            {error && (
              <p className="text-sm text-[var(--color-danger)] bg-[var(--color-danger)]/8 rounded-[var(--radius-sm)] px-3 py-2">{error}</p>
            )}

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>Cancelar</Button>
              <Button type="submit" disabled={isPending || !bookId || !fromId || !toId || !quantity}>
                {isPending ? "Transfiriendo..." : "Transferir"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

// ── Adjustment (physical count) ───────────────────────────────────────────────

export function AdjustStockModal({ books, inventories }: { books: Option[]; inventories: Option[] }) {
  const [open, setOpen]           = useState(false);
  const [bookId, setBookId]       = useState("");
  const [inventoryId, setInventoryId] = useState("");
  const [newCount, setNewCount]   = useState("");
  const [error, setError]         = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClose() {
    if (isPending) return;
    setOpen(false); setError(null);
  }
  const panelRef = useModalA11y<HTMLFormElement>(open, handleClose);

  function handleOpen() {
    setBookId(books[0]?.id ?? ""); setInventoryId(""); setNewCount("");
    setError(null); setOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await adjustStock({
        bookId, inventoryId, newCount: parseInt(newCount, 10),
      });
      if (result.error) setError(result.error);
      else { setOpen(false); router.refresh(); }
    });
  }

  return (
    <>
      <Button onClick={handleOpen} size="sm" variant="outline" className="gap-1.5">
        <Calculator size={14} />
        Ajustar conteo
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "oklch(0% 0 0 / 0.35)", backdropFilter: "blur(4px)" }}
          onClick={handleClose}
        >
          <form
            ref={panelRef} role="dialog" aria-modal="true" aria-label="Ajustar conteo físico"
            onSubmit={handleSubmit}
            className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] w-full max-w-sm shadow-xl p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--color-text)]" style={{ fontFamily: "var(--font-heading)" }}>
                Ajustar conteo físico
              </h2>
              <button type="button" onClick={handleClose} aria-label="Cerrar" className="p-2 -m-2 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">
              Corrige el stock registrado para que coincida con el conteo real.
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="adj-book">Libro</Label>
              <Select id="adj-book" value={bookId} onChange={setBookId} options={books} placeholder="Selecciona un libro" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adj-inv">Inventario</Label>
              <Select id="adj-inv" value={inventoryId} onChange={setInventoryId} options={inventories} placeholder="Selecciona un inventario" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adj-count">Conteo real</Label>
              <Input id="adj-count" type="number" min="0" step="1" inputMode="numeric"
                value={newCount} onChange={e => setNewCount(e.target.value)} placeholder="0" required />
            </div>

            {error && (
              <p className="text-sm text-[var(--color-danger)] bg-[var(--color-danger)]/8 rounded-[var(--radius-sm)] px-3 py-2">{error}</p>
            )}

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>Cancelar</Button>
              <Button type="submit" disabled={isPending || !bookId || !inventoryId || newCount === ""}>
                {isPending ? "Guardando..." : "Ajustar"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
