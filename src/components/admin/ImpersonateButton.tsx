"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { startImpersonation } from "@/actions/admin";
import { Eye } from "lucide-react";

export default function ImpersonateButton({ accountId }: { accountId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const result = await startImpersonation(accountId);
      if (!result.error) router.push("/dashboard");
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] text-sm font-medium border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors disabled:opacity-50"
    >
      <Eye size={15} />
      {isPending ? "Entrando…" : "Ver como esta usuaria"}
    </button>
  );
}
