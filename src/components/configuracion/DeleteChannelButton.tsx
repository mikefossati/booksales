"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteChannel } from "@/actions/channels";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export default function DeleteChannelButton({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!confirm(`¿Eliminar el canal "${name}"?`)) return;
    startTransition(async () => {
      const result = await deleteChannel(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Canal eliminado");
        router.refresh();
      }
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
