"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteExchange } from "@/actions/exchanges";
import { Trash2 } from "lucide-react";

export default function DeleteExchangeButton({
  id,
  recipient,
}: {
  id: string;
  recipient: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!confirm(`¿Eliminar el canje con "${recipient}"? Esto también revertirá el movimiento de inventario.`)) return;
    startTransition(async () => {
      await deleteExchange(id);
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/8 transition-colors disabled:opacity-50"
      title="Eliminar canje"
    >
      <Trash2 size={14} />
    </button>
  );
}
