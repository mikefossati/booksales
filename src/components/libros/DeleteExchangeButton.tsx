"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteExchange } from "@/actions/exchanges";
import { Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/ui/confirm-dialog";

export default function DeleteExchangeButton({
  id,
  recipient,
}: {
  id: string;
  recipient: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    startTransition(async () => {
      await deleteExchange(id);
      router.refresh();
      setOpen(false);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={isPending}
        aria-label={`Eliminar canje con ${recipient}`}
        title="Eliminar canje"
        className="p-2 -m-0.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/8 transition-colors disabled:opacity-50"
      >
        <Trash2 size={14} />
      </button>
      <ConfirmDialog
        open={open}
        title={`¿Eliminar el canje con "${recipient}"?`}
        description="Esto también revertirá el movimiento de inventario."
        loading={isPending}
        onConfirm={handleDelete}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
