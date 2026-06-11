"use client";

import { useModalA11y } from "@/hooks/useModalA11y";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

/**
 * Styled replacement for window.confirm() on destructive actions.
 * Renders nothing while `open` is false; the caller owns the open state
 * and runs the action in `onConfirm` (keeping `loading` true meanwhile).
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Eliminar",
  loadingLabel = "Eliminando...",
  cancelLabel = "Cancelar",
  loading = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  loadingLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  function handleClose() {
    if (!loading) onClose();
  }

  const panelRef = useModalA11y<HTMLDivElement>(open, handleClose);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
      style={{ backgroundColor: "oklch(0% 0 0 / 0.35)", backdropFilter: "blur(4px)" }}
      onClick={handleClose}
    >
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={e => e.stopPropagation()}
        className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] w-full max-w-sm shadow-xl p-5"
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-[var(--color-danger)]/10 text-[var(--color-danger)] flex items-center justify-center shrink-0">
            <AlertTriangle size={17} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-[var(--color-text)] leading-snug" style={{ fontFamily: "var(--font-heading)" }}>
              {title}
            </h2>
            {description && (
              <p className="text-sm text-[var(--color-text-muted)] mt-1 leading-snug">{description}</p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{ backgroundColor: "var(--color-danger)" }}
          >
            {loading ? loadingLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
