"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "@/actions/onboarding";
import { AutoriappLogo } from "@/components/brand/Logo";
import { BookFormat, ChannelType } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { BookOpen, Globe, Store, Users, Check, ArrowRight, TrendingUp, Receipt } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4;

type PresetChannel = {
  id: string;
  name: string;
  type: ChannelType;
  icon: React.ElementType;
  currency: string;
  hint: string;
};

const FORMAT_OPTIONS: { value: BookFormat; label: string; emoji: string }[] = [
  { value: "PRINT",     label: "Impreso",    emoji: "📖" },
  { value: "EBOOK",     label: "Ebook",      emoji: "💻" },
  { value: "AUDIOBOOK", label: "Audiolibro", emoji: "🎧" },
];

const CHANNEL_PRESETS: PresetChannel[] = [
  { id: "amazon",     name: "Amazon KDP",       type: "DIGITAL",   icon: Globe,  currency: "USD", hint: "Paga en USD" },
  { id: "buscalibre", name: "Buscalibre",        type: "DIGITAL",   icon: Globe,  currency: "USD",                       hint: "Paga en USD" },
  { id: "librerias",  name: "Librerías",         type: "BOOKSTORE", icon: Store,  currency: "CLP", hint: "Pagan después de vender" },
  { id: "ferias",     name: "Ferias del libro",  type: "DIRECT",    icon: Users,  currency: "CLP",                       hint: "Venta directa" },
  { id: "instagram",  name: "Instagram / Redes", type: "DIRECT",    icon: Users,  currency: "CLP",                       hint: "Venta directa" },
  { id: "otro",       name: "Otros canales",     type: "DIRECT",    icon: Users,  currency: "CLP",                       hint: "Personalizable" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function StepDots({ current, total }: { current: Step; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cn(
            "rounded-full transition-all duration-300",
            i + 1 === current
              ? "w-6 h-2 bg-[var(--color-accent)]"
              : i + 1 < current
              ? "w-2 h-2 bg-[var(--color-accent)]/40"
              : "w-2 h-2 bg-[var(--color-border)]"
          )}
        />
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function OnboardingWizard({ accountId }: { accountId: string }) {
  const [step, setStep]             = useState<Step>(1);
  const [title, setTitle]           = useState("");
  const [formats, setFormats]       = useState<BookFormat[]>(["PRINT"]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [hasPrint, setHasPrint]     = useState<boolean | null>(null);
  const [printQty, setPrintQty]     = useState("");
  const [printCost, setPrintCost]   = useState("");
  const [printSupplier, setPrintSupplier] = useState("");
  const [error, setError]           = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const totalSteps = formats.includes("PRINT") ? 4 : 3;

  function toggleFormat(f: BookFormat) {
    setFormats(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  }

  function toggleChannel(id: string) {
    setSelectedChannels(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function nextStep() {
    if (step === 2 && !formats.includes("PRINT")) {
      submit({ skip: false });
    } else {
      setStep(prev => Math.min(prev + 1, 4) as Step);
    }
  }

  function skip() {
    submit({ skip: true });
  }

  function submit({ skip: isSkip }: { skip: boolean }) {
    setError(null);
    startTransition(async () => {
      const channels = CHANNEL_PRESETS
        .filter(c => selectedChannels.includes(c.id))
        .map(c => ({
          name:               c.name,
          type:               c.type,
          currency:           c.currency,
        }));

      const printRun = !isSkip && hasPrint && printQty
        ? {
            quantity:  parseInt(printQty),
            totalCost: printCost ? parseFloat(printCost) : 0,
            supplier:  printSupplier || undefined,
          }
        : undefined;

      const result = await completeOnboarding({
        accountId,
        book: (!isSkip && title.trim()) ? { title, formats } : undefined,
        channels: channels.length ? channels : undefined,
        printRun,
      });

      if (result.error) {
        setError(result.error);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    });
  }

  // ── Step content ─────────────────────────────────────────────────────────────

  const stepContent = {
    1: (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-semibold text-[var(--color-text)] font-heading">
            ¿Cómo se llama tu libro?
          </h2>
          <p className="text-[var(--color-text-muted)] mt-2">
            Solo necesitas el título para empezar. Puedes completar el resto después.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ob-title">Título <span className="text-[var(--color-danger)]">*</span></Label>
          <Input
            id="ob-title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="El nombre de tu libro"
            className="text-base h-12"
            autoFocus
          />
        </div>

        <div className="space-y-3">
          <Label>¿En qué formato lo publicas?</Label>
          <div className="flex gap-3">
            {FORMAT_OPTIONS.map(({ value, label, emoji }) => (
              <button
                key={value}
                type="button"
                onClick={() => toggleFormat(value)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-2 py-4 rounded-[var(--radius-md)] border-2 text-sm font-medium transition-all",
                  formats.includes(value)
                    ? "border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-accent)]"
                    : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]/40"
                )}
              >
                <span className="text-2xl">{emoji}</span>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    ),

    2: (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-semibold text-[var(--color-text)] font-heading">
            ¿Dónde vendes tu libro?
          </h2>
          <p className="text-[var(--color-text-muted)] mt-2">
            Elige todos los que apliquen. Cada canal guarda su moneda y condiciones.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {CHANNEL_PRESETS.map(({ id, name, type, icon: Icon, currency, hint }) => {
            const selected = selectedChannels.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleChannel(id)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3.5 rounded-[var(--radius-md)] border-2 text-sm font-medium transition-all text-left",
                  selected
                    ? "border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-text)]"
                    : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]/40 hover:text-[var(--color-text)]"
                )}
              >
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                  selected ? "bg-[var(--color-accent)] text-white" : "bg-[var(--color-accent-light)] text-[var(--color-accent)]"
                )}>
                  {selected ? <Check size={13} /> : <Icon size={13} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate">{name}</p>
                  <p className="text-xs font-normal mt-0.5 text-[var(--color-text-muted)]">{hint}</p>
                </div>
                {currency !== "CLP" && (
                  <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-[var(--color-accent-light)] text-[var(--color-accent)] shrink-0">
                    {currency}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-[var(--color-text-muted)]">
          ¿Vendes en Argentina, México u otro país? Agrega canales con moneda local desde Configuración después de completar esto.
        </p>
      </div>
    ),

    3: (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-semibold text-[var(--color-text)] font-heading">
            ¿Tienes ejemplares impresos?
          </h2>
          <p className="text-[var(--color-text-muted)] mt-2">
            Si ya imprimiste, registra la tirada para hacer seguimiento del inventario y punto de equilibrio.
          </p>
        </div>

        <div className="flex gap-3">
          {[true, false].map(val => (
            <button
              key={String(val)}
              type="button"
              onClick={() => setHasPrint(val)}
              className={cn(
                "flex-1 py-3.5 rounded-[var(--radius-md)] border-2 text-sm font-medium transition-all",
                hasPrint === val
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-accent)]"
                  : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]/40"
              )}
            >
              {val ? "Sí, tengo copias" : "No por ahora"}
            </button>
          ))}
        </div>

        {hasPrint && (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ob-qty">Cantidad de ejemplares <span className="text-[var(--color-danger)]">*</span></Label>
                <Input
                  id="ob-qty" type="number" min="1" step="1" inputMode="numeric"
                  value={printQty} onChange={e => setPrintQty(e.target.value)}
                  placeholder="200"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ob-cost">Costo total <span className="text-xs font-normal text-[var(--color-text-muted)]">(opcional)</span></Label>
                <Input
                  id="ob-cost" type="number" min="0" step="1" inputMode="numeric"
                  value={printCost} onChange={e => setPrintCost(e.target.value)}
                  placeholder="480000"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ob-supplier">Proveedor <span className="text-xs font-normal text-[var(--color-text-muted)]">(opcional)</span></Label>
              <Input
                id="ob-supplier"
                value={printSupplier} onChange={e => setPrintSupplier(e.target.value)}
                placeholder="Imprenta nombre"
              />
            </div>
          </div>
        )}
      </div>
    ),

    4: (
      <div className="space-y-6">
        <div>
          <div className="w-14 h-14 rounded-full bg-[var(--color-accent-light)] flex items-center justify-center mb-5">
            <Check size={26} className="text-[var(--color-accent)]" />
          </div>
          <h2 className="text-3xl font-semibold text-[var(--color-text)] font-heading">
            ¡Todo listo!
          </h2>
          <p className="text-[var(--color-text-muted)] mt-2">
            Aquí está lo que configuraste para empezar:
          </p>
        </div>

        {/* Summary of configured items */}
        <div className="space-y-2.5">
          {title && (
            <div className="flex items-start gap-3 p-4 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)]">
              <BookOpen size={16} className="text-[var(--color-accent)] mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-[var(--color-text)]">{title}</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  {formats.map(f => f === "PRINT" ? "Impreso" : f === "EBOOK" ? "Ebook" : "Audiolibro").join(" · ")}
                </p>
              </div>
            </div>
          )}
          {selectedChannels.length > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)]">
              <Globe size={16} className="text-[var(--color-accent)] mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-[var(--color-text)]">
                  {selectedChannels.length} {selectedChannels.length === 1 ? "canal" : "canales"} de venta
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  {CHANNEL_PRESETS.filter(c => selectedChannels.includes(c.id)).map(c => c.name).join(", ")}
                </p>
              </div>
            </div>
          )}
          {hasPrint && printQty && (
            <div className="flex items-start gap-3 p-4 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)]">
              <BookOpen size={16} className="text-[var(--color-accent)] mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-[var(--color-text)]">{parseInt(printQty).toLocaleString("es-CL")} ejemplares en inventario</p>
                {printCost && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    Costo: ${parseFloat(printCost).toLocaleString("es-CL")}
                  </p>
                )}
              </div>
            </div>
          )}
          {!title && selectedChannels.length === 0 && (
            <p className="text-sm text-[var(--color-text-muted)] py-2">
              Saltaste la configuración inicial — puedes agregar todo desde Configuración cuando quieras.
            </p>
          )}
        </div>

        {/* What to expect on the dashboard */}
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-accent-light)]/40 p-4 space-y-3">
          <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">En tu dashboard verás</p>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-[var(--radius-sm)] bg-[var(--color-accent)] flex items-center justify-center shrink-0">
                <TrendingUp size={13} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-text)]">📚 Mis Ventas</p>
                <p className="text-xs text-[var(--color-text-muted)]">Ingresos, canales, últimas ventas — con botón + para registrar al instante</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--color-warning)" }}>
                <Receipt size={13} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-text)]">💸 Mis Gastos</p>
                <p className="text-xs text-[var(--color-text-muted)]">Gastos por categoría, últimos registros — con botón + para registrar al instante</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] pt-1">
            El botón <span className="font-medium text-[var(--color-accent)]">+</span> flotante también está disponible en todas las pantallas para registrar ventas, gastos y más.
          </p>
        </div>
      </div>
    ),
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  const isLastStep = step === 4 || (step === 3 && !formats.includes("PRINT"));

  const canAdvanceStep1 = step === 1 && title.trim().length > 0;
  const canAdvanceStep3 = step === 3 && (hasPrint === false || (hasPrint === true && printQty));

  const canAdvance =
    step === 1 ? canAdvanceStep1 :
    step === 2 ? true :
    step === 3 ? !!canAdvanceStep3 :
    true;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-5">
        <AutoriappLogo size="sm" />
        <StepDots current={step} total={totalSteps} />
      </header>

      {/* Content */}
      <main className="flex-1 flex items-start justify-center px-6 pt-10 pb-6">
        <div className="w-full max-w-lg">
          <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-widest mb-6">
            Paso {step} de {totalSteps}
          </p>

          {stepContent[step]}

          {error && (
            <p className="mt-4 text-sm text-[var(--color-danger)] bg-[var(--color-danger)]/8 rounded-[var(--radius-sm)] px-3 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-10">
            <button
              type="button"
              onClick={skip}
              disabled={isPending}
              className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors disabled:opacity-40"
            >
              Completar después
            </button>

            <Button
              onClick={isLastStep ? () => submit({ skip: false }) : nextStep}
              disabled={isPending || (!isLastStep && step !== 2 && !canAdvance)}
              className="gap-2 px-6"
            >
              {isPending
                ? "Guardando..."
                : isLastStep
                ? "Ir al dashboard"
                : "Siguiente"}
              {!isPending && <ArrowRight size={15} />}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
