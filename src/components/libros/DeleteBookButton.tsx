"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteBook } from "@/actions/books";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function DeleteBookButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!confirm("¿Eliminar este libro? Esta acción no se puede deshacer.")) return;
    startTransition(async () => {
      const result = await deleteBook(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        router.push("/libros");
        router.refresh();
      }
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] transition-colors disabled:opacity-40"
    >
      <Trash2 size={12} />
      Eliminar
    </button>
  );
}
