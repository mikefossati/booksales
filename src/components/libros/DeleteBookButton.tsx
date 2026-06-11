"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteBook } from "@/actions/books";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ui/confirm-dialog";

export default function DeleteBookButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteBook(id);
      if (result.error) {
        toast.error(result.error);
        setOpen(false);
      } else {
        router.push("/libros");
        router.refresh();
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] transition-colors disabled:opacity-40"
      >
        <Trash2 size={12} />
        Eliminar
      </button>
      <ConfirmDialog
        open={open}
        title="¿Eliminar este libro?"
        description="Se eliminarán también sus tiradas y movimientos de inventario. Esta acción no se puede deshacer."
        loading={isPending}
        onConfirm={handleDelete}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
