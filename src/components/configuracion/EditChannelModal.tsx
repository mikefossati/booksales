"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateChannel } from "@/actions/channels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, X } from "lucide-react";
import type { Channel } from "@/generated/prisma/client";
import { useModalA11y } from "@/hooks/useModalA11y";

const CURRENCIES = [
  { value: "CLP", label: "CLP — Peso chileno"       },
  { value: "ARS", label: "ARS — Peso argentino"      },
  { value: "USD", label: "USD — Dólar estadounidense" },
  { value: "EUR", label: "EUR — Euro"                },
  { value: "BRL", label: "BRL — Real brasileño"      },
  { value: "UYU", label: "UYU — Peso uruguayo"       },
  { value: "MXN", label: "MXN — Peso mexicano"       },
  { value: "COP", label: "COP — Peso colombiano"     },
];

export default function EditChannelModal({
  channel,
  inventories = [],
}: {
  channel: Channel;
  inventories?: { id: string; name: string }[];
}) {
  const [open, setOpen]               = useState(false);
  const [name, setName]               = useState(channel.name);
  const [currency, setCurrency]       = useState(channel.currency ?? "");
  const [city, setCity]               = useState(channel.city ?? "");
  const [inventoryChoice, setInventoryChoice] = useState(channel.inventoryId ?? "none");
  const [error, setError]             = useState<string | null>(null);
  const [isPending, startTransition]  = useTransition();
  const router = useRouter();

  const panelRef = useModalA11y<HTMLDivElement>(open, handleClose);

  function handleClose() {
    if (isPending) return;
    setOpen(false);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateChannel({
        id: channel.id,
        name,
        currency:          currency    || null,
        city:              city        || null,
        inventoryId:       inventoryChoice,
      });
      if (result.error) setError(result.error);
      else { handleClose(); router.refresh(); }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 -m-1 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-light)] transition-colors"
        aria-label="Editar canal" title="Editar canal"
      >
        <Pencil size={15} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "oklch(0% 0 0 / 0.35)", backdropFilter: "blur(4px)" }}
          onClick={handleClose}
        >
          <div
            className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] w-full max-w-sm shadow-xl"
            ref={panelRef} role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-text)]" style={{ fontFamily: "var(--font-heading)" }}>
                  Editar canal
                </h2>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  {channel.type === "DIGITAL" ? "Digital" : channel.type === "BOOKSTORE" ? "Librería" : "Directo"}
                </p>
              </div>
              <button onClick={handleClose} disabled={isPending} aria-label="Cerrar" className="p-2 -m-2 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ech-name">Nombre <span className="text-[var(--color-danger)]">*</span></Label>
                <Input id="ech-name" value={name} onChange={e => setName(e.target.value)} required autoFocus />
              </div>

              {channel.type === "BOOKSTORE" && (
                <div className="space-y-1.5">
                  <Label htmlFor="ech-city">Ciudad</Label>
                  <Input id="ech-city" value={city} onChange={e => setCity(e.target.value)} placeholder="Santiago" />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="ech-inventory">Inventario</Label>
                <select
                  id="ech-inventory"
                  value={inventoryChoice}
                  onChange={(e) => setInventoryChoice(e.target.value)}
                  className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)]"
                >
                  <option value="none">Sin inventario (impresión bajo demanda)</option>
                  {inventories.map(i => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ech-currency">Moneda de este canal</Label>
                <select
                  id="ech-currency"
                  value={CURRENCIES.some(c => c.value === currency) ? currency : "CLP"}
                  onChange={e => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)]"
                >
                  {CURRENCIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {error && (
                <p className="text-sm text-[var(--color-danger)] bg-[var(--color-danger)]/8 rounded-[var(--radius-sm)] px-3 py-2">{error}</p>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>Cancelar</Button>
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
