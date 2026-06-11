"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteMerchandise } from "@/actions/merchandise";
import { Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/ui/confirm-dialog";

export default function DeleteMerchButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    startTransition(async () => {
      await deleteMerchandise(id);
      router.refresh();
      setOpen(false);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={isPending}
        aria-label={`Eliminar ${name}`}
        title="Eliminar producto"
        className="p-2 -m-0.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/8 transition-colors disabled:opacity-50"
      >
        <Trash2 size={14} />
      </button>
      <ConfirmDialog
        open={open}
        title={`¿Eliminar "${name}"?`}
        description="Se perderán los datos del producto, pero el historial de ventas se conserva."
        loading={isPending}
        onConfirm={handleDelete}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
