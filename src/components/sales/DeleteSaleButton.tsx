"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteSale } from "@/actions/sales";
import { Trash2 } from "lucide-react";

export default function DeleteSaleButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!confirm("¿Eliminar esta venta?")) return;
    startTransition(async () => {
      await deleteSale(id);
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors disabled:opacity-40"
      title="Eliminar venta"
    >
      <Trash2 size={14} />
    </button>
  );
}
