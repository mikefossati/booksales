"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { revokeMember } from "@/actions/members";
import { UserMinus } from "lucide-react";

export default function RevokeMemberButton({
  memberId,
  name,
}: {
  memberId: string;
  name: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleRevoke() {
    if (!confirm(`¿Revocar el acceso de "${name}"?`)) return;
    startTransition(async () => {
      await revokeMember(memberId);
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleRevoke}
      disabled={isPending}
      title="Revocar acceso"
      className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/8 transition-colors disabled:opacity-50"
    >
      <UserMinus size={14} />
    </button>
  );
}
