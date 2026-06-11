"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteChannel } from "@/actions/channels";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/ui/confirm-dialog";

export default function DeleteChannelButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteChannel(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Canal eliminado");
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
        aria-label={`Eliminar canal ${name}`}
        title="Eliminar canal"
        className="p-2 -m-1 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/8 transition-colors disabled:opacity-50"
      >
        <Trash2 size={15} />
      </button>
      <ConfirmDialog
        open={open}
        title={`¿Eliminar el canal "${name}"?`}
        description="Las ventas registradas en este canal se conservan."
        loading={isPending}
        onConfirm={handleDelete}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
