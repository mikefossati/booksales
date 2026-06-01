"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteExpense } from "@/actions/expenses";
import { Trash2 } from "lucide-react";

export default function DeleteExpenseButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!confirm("¿Eliminar este gasto?")) return;
    startTransition(async () => {
      await deleteExpense(id);
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors disabled:opacity-40"
      title="Eliminar gasto"
    >
      <Trash2 size={14} />
    </button>
  );
}
