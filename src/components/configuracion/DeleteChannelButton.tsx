"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteChannel } from "@/actions/channels";
import { Trash2 } from "lucide-react";

export default function DeleteChannelButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!confirm("¿Eliminar este canal? Se perderán los datos asociados.")) return;
    startTransition(async () => {
      await deleteChannel(id);
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors disabled:opacity-50"
      title="Eliminar canal"
    >
      <Trash2 size={15} />
    </button>
  );
}
