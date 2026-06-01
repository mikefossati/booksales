"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateBook } from "@/actions/books";
import { BookFormat } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Book } from "@/generated/prisma/client";

const FORMAT_OPTIONS: { value: BookFormat; label: string }[] = [
  { value: "PRINT",     label: "Impreso"    },
  { value: "EBOOK",     label: "Ebook"      },
  { value: "AUDIOBOOK", label: "Audiolibro" },
];

export default function EditBookModal({ book }: { book: Book }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle]             = useState(book.title);
  const [subtitle, setSubtitle]       = useState(book.subtitle ?? "");
  const [formats, setFormats]         = useState<BookFormat[]>(book.formats as BookFormat[]);
  const [isbn, setIsbn]               = useState(book.isbn ?? "");
  const [language, setLanguage]       = useState(book.language ?? "");
  const [publishedAt, setPublishedAt] = useState(
    book.publishedAt ? new Date(book.publishedAt).toISOString().split("T")[0] : ""
  );
  const [coverUrl, setCoverUrl]       = useState(book.coverUrl ?? "");
  const [description, setDescription] = useState(book.description ?? "");
  const [error, setError]             = useState<string | null>(null);
  const [isPending, startTransition]  = useTransition();
  const router = useRouter();

  function toggleFormat(f: BookFormat) {
    setFormats(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  }

  function handleClose() {
    if (isPending) return;
    setOpen(false);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateBook({
        id: book.id,
        title, subtitle: subtitle || undefined,
        formats, isbn: isbn || undefined,
        language: language || undefined,
        publishedAt: publishedAt || undefined,
        coverUrl: coverUrl || undefined,
        description: description || undefined,
      });
      if (result.error) setError(result.error);
      else { handleClose(); router.refresh(); }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
      >
        <Pencil size={12} />
        Editar
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "oklch(0% 0 0 / 0.35)", backdropFilter: "blur(4px)" }}
          onClick={handleClose}
        >
          <div
            className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] w-full max-w-md shadow-xl max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] shrink-0">
              <h2 className="text-lg font-semibold text-[var(--color-text)]" style={{ fontFamily: "var(--font-heading)" }}>
                Editar libro
              </h2>
              <button onClick={handleClose} disabled={isPending} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto">
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="eb-title">Título <span className="text-[var(--color-danger)]">*</span></Label>
                  <Input id="eb-title" value={title} onChange={e => setTitle(e.target.value)} required autoFocus />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="eb-subtitle">Subtítulo</Label>
                  <Input id="eb-subtitle" value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Opcional" />
                </div>

                <div className="space-y-2">
                  <Label>Formato(s)</Label>
                  <div className="flex gap-2">
                    {FORMAT_OPTIONS.map(({ value, label }) => (
                      <button key={value} type="button" onClick={() => toggleFormat(value)}
                        className={cn(
                          "flex-1 py-2 rounded-[var(--radius-md)] border text-sm font-medium transition-colors",
                          formats.includes(value)
                            ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]"
                            : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]"
                        )}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="eb-isbn">ISBN</Label>
                    <Input id="eb-isbn" value={isbn} onChange={e => setIsbn(e.target.value)} placeholder="978-..." />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="eb-lang">Idioma</Label>
                    <Input id="eb-lang" value={language} onChange={e => setLanguage(e.target.value)} placeholder="Español" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="eb-date">Fecha de publicación</Label>
                  <Input id="eb-date" type="date" value={publishedAt} onChange={e => setPublishedAt(e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="eb-cover">URL de portada</Label>
                  <Input id="eb-cover" value={coverUrl} onChange={e => setCoverUrl(e.target.value)}
                    placeholder="https://..." type="url" />
                  <p className="text-xs text-[var(--color-text-muted)]">Enlace directo a la imagen de portada</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="eb-desc">Sinopsis / notas internas</Label>
                  <textarea
                    id="eb-desc"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Descripción del libro o notas para uso interno..."
                    className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)] placeholder:text-[var(--color-text-muted)]"
                  />
                </div>

                {error && (
                  <p className="text-sm text-[var(--color-danger)] bg-[var(--color-danger)]/8 rounded-[var(--radius-sm)] px-3 py-2">{error}</p>
                )}
              </div>

              <div className="flex justify-end gap-3 px-6 pb-6 pt-2 shrink-0">
                <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>Cancelar</Button>
                <Button type="submit" disabled={isPending || !title.trim() || !formats.length}>
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
