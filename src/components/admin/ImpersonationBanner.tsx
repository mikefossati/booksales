"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { stopImpersonation } from "@/actions/admin";
import { ShieldAlert, X } from "lucide-react";

interface Props {
  email:     string;
  accountId: string;
}

export default function ImpersonationBanner({ email, accountId }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleStop() {
    startTransition(async () => {
      await stopImpersonation();
      router.push(`/admin/accounts/${accountId}`);
    });
  }

  return (
    <div className="fixed top-0 inset-x-0 z-50 flex items-center justify-between gap-3 px-4 py-2.5 bg-amber-500 text-white text-sm font-medium shadow-md">
      <div className="flex items-center gap-2">
        <ShieldAlert size={15} className="shrink-0" />
        <span>
          Modo vista: viendo como <strong>{email}</strong>
        </span>
      </div>
      <button
        onClick={handleStop}
        disabled={isPending}
        className="flex items-center gap-1.5 px-3 py-1 rounded bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50 shrink-0"
      >
        <X size={13} />
        {isPending ? "Saliendo…" : "Salir"}
      </button>
    </div>
  );
}
