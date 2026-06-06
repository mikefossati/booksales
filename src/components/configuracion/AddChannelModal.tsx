"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createChannel } from "@/actions/channels";
import { ChannelType } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X, Globe, Store, Users, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";

const CHANNEL_TYPES: {
  value: ChannelType;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  { value: "DIGITAL",   label: "Digital",    description: "Amazon KDP, Buscalibre, etc.",     icon: Globe         },
  { value: "BOOKSTORE", label: "Librería",   description: "Consignación o revenue share",      icon: Store         },
  { value: "DIRECT",    label: "Directo",    description: "Ferias, Instagram, en persona",     icon: Users         },
  { value: "PRESALE",   label: "Preventa",   description: "Campaña antes del lanzamiento",     icon: CalendarClock },
];

const CURRENCIES = [
  { value: "CLP", label: "CLP — Peso chileno"      },
  { value: "ARS", label: "ARS — Peso argentino"     },
  { value: "USD", label: "USD — Dólar estadounidense"},
  { value: "EUR", label: "EUR — Euro"               },
  { value: "BRL", label: "BRL — Real brasileño"     },
  { value: "UYU", label: "UYU — Peso uruguayo"      },
  { value: "MXN", label: "MXN — Peso mexicano"      },
  { value: "COP", label: "COP — Peso colombiano"    },
];

const QUICK_NAMES: Record<ChannelType, string[]> = {
  DIGITAL:   ["Amazon KDP", "Buscalibre", "Google Play Books"],
  BOOKSTORE: ["Librería Antártica", "Feria del Libro"],
  DIRECT:    ["Instagram", "Ferias", "WhatsApp"],
  PRESALE:   ["Preventa Lanzamiento"],
};

export default function AddChannelModal({ accountId }: { accountId: string }) {
  const [open, setOpen]         = useState(false);
  const [step, setStep]         = useState<1 | 2>(1);
  const [type, setType]         = useState<ChannelType>("DIGITAL");
  const [name, setName]         = useState("");
  const [royalty, setRoyalty]   = useState("");
  const [consignment, setConsignment] = useState("");
  const [currency, setCurrency] = useState("CLP");
  const [city, setCity]         = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClose() {
    if (isPending) return;
    setOpen(false);
    setStep(1);
    setName("");
    setRoyalty("");
    setConsignment("");
    setCurrency("CLP");
    setCity("");
    setError(null);
  }

  function handleTypeSelect(t: ChannelType) {
    setType(t);
    setName("");
    setStep(2);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createChannel({
        accountId,
        name,
        type,
        royaltyPercent:    royalty     ? parseFloat(royalty)     : null,
        consignmentPercent: consignment ? parseFloat(consignment) : null,
        currency:          currency    || null,
        city:              city        || null,
      });
      if (result.error) {
        setError(result.error);
      } else {
        handleClose();
        router.refresh();
      }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm" className="gap-1.5">
        <Plus size={15} />
        Agregar canal
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "oklch(0% 0 0 / 0.35)", backdropFilter: "blur(4px)" }}
          onClick={handleClose}
        >
          <div
            className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-text)]" style={{ fontFamily: "var(--font-heading)" }}>
                  {step === 1 ? "Agregar canal" : "Detalles del canal"}
                </h2>
                {step === 2 && (
                  <button onClick={() => setStep(1)} className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors mt-0.5">
                    ← Cambiar tipo
                  </button>
                )}
              </div>
              <button onClick={handleClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors" disabled={isPending}>
                <X size={18} />
              </button>
            </div>

            {/* Step 1 — type selection */}
            {step === 1 && (
              <div className="p-6 grid grid-cols-2 gap-3">
                {CHANNEL_TYPES.map(({ value, label, description, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => handleTypeSelect(value)}
                    className="flex flex-col items-start gap-2 p-4 rounded-[var(--radius-md)] border-2 border-[var(--color-border)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-light)] transition-colors duration-[var(--duration-fast)] text-left"
                  >
                    <div className="p-2 rounded-[var(--radius-sm)] bg-[var(--color-accent-light)] text-[var(--color-accent)]">
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-text)]">{label}</p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{description}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Step 2 — details */}
            {step === 2 && (
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Quick name suggestions */}
                <div className="flex flex-wrap gap-1.5 mb-1">
                  {QUICK_NAMES[type].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setName(n)}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs border transition-colors",
                        name === n
                          ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]"
                          : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ch-name">Nombre <span className="text-[var(--color-danger)]">*</span></Label>
                  <Input id="ch-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del canal" required autoFocus />
                </div>

                {type === "DIGITAL" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="ch-royalty">Regalías (%)</Label>
                    <Input id="ch-royalty" type="number" min="0" max="100" step="0.01" value={royalty} onChange={(e) => setRoyalty(e.target.value)} placeholder="35" />
                  </div>
                )}

                {type === "BOOKSTORE" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="ch-consignment">Consignación (%)</Label>
                      <Input id="ch-consignment" type="number" min="0" max="100" step="0.01" value={consignment} onChange={(e) => setConsignment(e.target.value)} placeholder="30" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ch-city">Ciudad</Label>
                      <Input id="ch-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Santiago" />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="ch-currency">Moneda de este canal</Label>
                  <select
                    id="ch-currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
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
                  <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={isPending}>Atrás</Button>
                  <Button type="submit" disabled={isPending || !name.trim()}>{isPending ? "Guardando..." : "Agregar canal"}</Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
