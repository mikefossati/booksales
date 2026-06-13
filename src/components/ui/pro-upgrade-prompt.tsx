"use client";

import { useState } from "react";
import { Lock, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useModalA11y } from "@/hooks/useModalA11y";

interface ProUpgradePromptProps {
  feature: string;
  description: string;
  onClose: () => void;
}

export function ProUpgradePrompt({ feature, description, onClose }: ProUpgradePromptProps) {
  const panelRef = useModalA11y<HTMLDivElement>(true, onClose);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "oklch(0% 0 0 / 0.35)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] w-full max-w-sm shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-[var(--color-accent)]" />
            <h2 className="text-base font-semibold text-[var(--color-text)] font-heading">
              Función Pro
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="p-2 -m-2 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-accent-light)] flex items-center justify-center shrink-0">
              <Sparkles size={18} className="text-[var(--color-accent)]" />
            </div>
            <div>
              <p className="font-medium text-[var(--color-text)]">{feature}</p>
              <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{description}</p>
            </div>
          </div>

          <div className="rounded-[var(--radius-md)] bg-[var(--color-accent-light)] px-4 py-3 text-sm text-[var(--color-accent)]">
            Actualiza al plan Pro para desbloquear esta y todas las funciones avanzadas.
          </div>

          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Ahora no
            </Button>
            <Button className="flex-1 gap-1.5" disabled title="Próximamente">
              <Sparkles size={14} />
              Actualizar a Pro
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ProLockedButtonProps {
  label: string;
  feature: string;
  description: string;
  size?: "sm" | "default";
}

export function ProLockedButton({ label, feature, description, size = "sm" }: ProLockedButtonProps) {
  const [showPrompt, setShowPrompt] = useState(false);

  return (
    <>
      <Button
        size={size}
        variant="outline"
        className="gap-1.5 opacity-70"
        onClick={() => setShowPrompt(true)}
      >
        <Lock size={14} />
        {label}
      </Button>

      {showPrompt && (
        <ProUpgradePrompt
          feature={feature}
          description={description}
          onClose={() => setShowPrompt(false)}
        />
      )}
    </>
  );
}
