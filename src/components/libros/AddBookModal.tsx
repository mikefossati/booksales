"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBook } from "@/actions/books";
import { BookFormat } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import { useModalA11y } from "@/hooks/useModalA11y";
import { ProLockedButton } from "@/components/ui/pro-upgrade-prompt";

const FORMAT_OPTIONS: { value: BookFormat; label: string }[] = [
  { value: "PRINT", label: "Impreso" },
  { value: "EBOOK", label: "Ebook" },
  { value: "AUDIOBOOK", label: "Audiolibro" },
];

export default function AddBookModal({
  accountId,
  atLimit = false,
}: {
  accountId: string;
  atLimit?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [formats, setFormats] = useState<BookFormat[]>(["PRINT"]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggleFormat(format: BookFormat) {
    setFormats((prev) =>
      prev.includes(format) ? prev.filter((f) => f !== format) : [...prev, format]
    );
  }

  const panelRef = useModalA11y<HTMLDivElement>(open, handleClose);

  function handleClose() {
    if (isPending) return;
    setOpen(false);
    setTitle("");
    setFormats(["PRINT"]);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createBook({ accountId, title, formats });
      if (result.error) {
        setError(result.error);
      } else {
        handleClose();
        router.refresh();
      }
    });
  }

  if (atLimit) {
    return (
      <ProLockedButton
        label="Agregar libro"
        feature="Catálogo ilimitado"
        description="El plan gratuito incluye 1 libro. Con Pro podés gestionar todos tus títulos sin límite."
      />
    );
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm" className="gap-1.5">
        <Plus size={15} />
        Agregar libro
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "oklch(0% 0 0 / 0.35)", backdropFilter: "blur(4px)" }}
          onClick={handleClose}
        >
          <div
            className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] w-full max-w-md shadow-xl"
            ref={panelRef} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
              <h2
                className="text-lg font-semibold text-[var(--color-text)] font-heading"
              >
                Agregar libro
              </h2>
              <button
                onClick={handleClose}
                aria-label="Cerrar" className="p-2 -m-2 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                disabled={isPending}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="book-title">
                  Título{" "}
                  <span className="text-[var(--color-danger)]" aria-hidden>*</span>
                </Label>
                <Input
                  id="book-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="El nombre de tu libro"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label>Formato(s)</Label>
                <div className="flex gap-2 flex-wrap">
                  {FORMAT_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleFormat(value)}
                      className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-sm font-medium border transition-colors duration-[var(--duration-fast)] ${
                        formats.includes(value)
                          ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]"
                          : "text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-sm text-[var(--color-danger)] bg-[var(--color-danger)]/8 rounded-[var(--radius-sm)] px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isPending || !title.trim() || formats.length === 0}
                >
                  {isPending ? "Guardando..." : "Agregar libro"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
