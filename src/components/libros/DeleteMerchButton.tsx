"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteMerchandise } from "@/actions/merchandise";
import { Trash2 } from "lucide-react";

export default function DeleteMerchButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!confirm(`¿Eliminar "${name}"? Se perderán los datos del producto, pero el historial de ventas se conserva.`)) return;
    startTransition(async () => {
      await deleteMerchandise(id);
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/8 transition-colors disabled:opacity-50"
      title="Eliminar producto"
    >
      <Trash2 size={14} />
    </button>
  );
}
