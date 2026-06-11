"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createInventory, updateInventory, deleteInventory } from "@/actions/inventories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useModalA11y } from "@/hooks/useModalA11y";
import ConfirmDialog from "@/components/ui/confirm-dialog";

// ── Shared modal shell ────────────────────────────────────────────────────────

function NameModal({
  title,
  initialName,
  submitLabel,
  open,
  onClose,
  onSubmit,
  isPending,
  error,
}: {
  title: string;
  initialName: string;
  submitLabel: string;
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
  isPending: boolean;
  error: string | null;
}) {
  const [name, setName] = useState(initialName);
  const panelRef = useModalA11y<HTMLDivElement>(open, onClose);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "oklch(0% 0 0 / 0.35)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        ref={panelRef} role="dialog" aria-modal="true" aria-label={title}
        className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] w-full max-w-sm shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text)]" style={{ fontFamily: "var(--font-heading)" }}>
            {title}
          </h2>
          <button onClick={onClose} disabled={isPending} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSubmit(name); }} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="inv-name">Nombre</Label>
            <Input id="inv-name" value={name} onChange={e => setName(e.target.value)}
              placeholder="Ej: Bodega, Feria del libro…" required autoFocus />
          </div>
          {error && (
            <p className="text-sm text-[var(--color-danger)] bg-[var(--color-danger)]/8 rounded-[var(--radius-sm)] px-3 py-2">{error}</p>
          )}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Cancelar</Button>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending ? "Guardando..." : submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add ───────────────────────────────────────────────────────────────────────

export function AddInventoryModal() {
  const [open, setOpen]   = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(name: string) {
    setError(null);
    startTransition(async () => {
      const result = await createInventory({ name });
      if (result.error) setError(result.error);
      else { setOpen(false); router.refresh(); }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm" className="gap-1.5">
        <Plus size={15} />
        Nuevo inventario
      </Button>
      <NameModal
        title="Nuevo inventario" initialName="" submitLabel="Crear"
        open={open} onClose={() => { if (!isPending) { setOpen(false); setError(null); } }}
        onSubmit={handleSubmit} isPending={isPending} error={error}
      />
    </>
  );
}

// ── Edit ──────────────────────────────────────────────────────────────────────

export function EditInventoryButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen]   = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(newName: string) {
    setError(null);
    startTransition(async () => {
      const result = await updateInventory({ id, name: newName });
      if (result.error) setError(result.error);
      else { setOpen(false); router.refresh(); }
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)} title="Renombrar"
        className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors">
        <Pencil size={14} />
      </button>
      {open && (
        <NameModal
          title="Renombrar inventario" initialName={name} submitLabel="Guardar"
          open={open} onClose={() => { if (!isPending) { setOpen(false); setError(null); } }}
          onSubmit={handleSubmit} isPending={isPending} error={error}
        />
      )}
    </>
  );
}

// ── Delete ────────────────────────────────────────────────────────────────────

export function DeleteInventoryButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteInventory(id);
      if (result.error) toast.error(result.error);
      else { toast.success("Inventario eliminado"); router.refresh(); }
      setOpen(false);
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)} disabled={isPending}
        aria-label={`Eliminar inventario ${name}`} title="Eliminar"
        className="p-2 -m-1 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/8 transition-colors">
        <Trash2 size={14} />
      </button>
      <ConfirmDialog
        open={open}
        title={`¿Eliminar el inventario "${name}"?`}
        description="Los canales asociados quedarán sin inventario."
        loading={isPending}
        onConfirm={handleDelete}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
