"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePreferences } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";

const CURRENCIES = [
  { value: "CLP", label: "$ Peso Chileno (CLP)"       },
  { value: "USD", label: "$ Dólar Americano (USD)"     },
  { value: "EUR", label: "€ Euro (EUR)"                },
  { value: "ARS", label: "$ Peso Argentino (ARS)"      },
  { value: "MXN", label: "$ Peso Mexicano (MXN)"       },
  { value: "COP", label: "$ Peso Colombiano (COP)"     },
  { value: "PEN", label: "S/ Sol Peruano (PEN)"        },
  { value: "BRL", label: "R$ Real Brasileño (BRL)"     },
];

const DATE_FORMATS = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY — ej. 31/12/2025" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY — ej. 12/31/2025" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD — ej. 2025-12-31" },
];

const SELECT_CLS = "w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)]";

export default function PreferenciasForm({
  accountId,
  baseCurrency,
  dateFormat,
}: {
  accountId: string;
  baseCurrency: string;
  dateFormat: string;
}) {
  const [currency, setCurrency]      = useState(baseCurrency);
  const [format, setFormat]          = useState(dateFormat);
  const [saved, setSaved]            = useState(false);
  const [error, setError]            = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false); setError(null);
    startTransition(async () => {
      const result = await updatePreferences({ accountId, baseCurrency: currency, dateFormat: format });
      if (result.error) { setError(result.error); }
      else { setSaved(true); router.refresh(); }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-md">
      <div className="space-y-1.5">
        <Label>Moneda base</Label>
        <select value={currency} onChange={e => { setCurrency(e.target.value); setSaved(false); }} className={SELECT_CLS}>
          {CURRENCIES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <p className="text-xs text-[var(--color-text-muted)]">
          Usada en todos los reportes y gráficos. Las ventas en otras monedas se muestran tal cual.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>Formato de fecha</Label>
        <select value={format} onChange={e => { setFormat(e.target.value); setSaved(false); }} className={SELECT_CLS}>
          {DATE_FORMATS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {error && (
        <p className="text-sm text-[var(--color-danger)] bg-[var(--color-danger)]/8 rounded-[var(--radius-sm)] px-3 py-2">{error}</p>
      )}

      {saved && (
        <p className="flex items-center gap-1.5 text-sm text-[var(--color-success)]">
          <CheckCircle2 size={15} /> Preferencias guardadas
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Guardando..." : "Guardar preferencias"}
      </Button>
    </form>
  );
}
