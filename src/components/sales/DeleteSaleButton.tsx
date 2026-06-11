"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteSale } from "@/actions/sales";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/ui/confirm-dialog";

export default function DeleteSaleButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteSale(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Venta eliminada");
        router.refresh();
      }
      setOpen(false);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={isPending}
        aria-label="Eliminar venta"
        title="Eliminar venta"
        className="p-2 -m-1 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/8 transition-colors disabled:opacity-40"
      >
        <Trash2 size={14} />
      </button>
      <ConfirmDialog
        open={open}
        title="¿Eliminar esta venta?"
        description="Esta acción no se puede deshacer."
        loading={isPending}
        onConfirm={handleDelete}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
