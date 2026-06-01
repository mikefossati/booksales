"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateMemberRole } from "@/actions/members";
import type { UserRole } from "@/generated/prisma/client";

const ROLE_LABELS: Record<UserRole, string> = {
  OWNER:  "Propietaria",
  EDITOR: "Editor",
  VIEWER: "Visor",
};

export default function ChangeMemberRoleButton({
  memberId,
  currentRole,
}: {
  memberId: string;
  currentRole: UserRole;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value as UserRole;
    startTransition(async () => {
      await updateMemberRole({ memberId, role: newRole });
      router.refresh();
    });
  }

  return (
    <select
      value={currentRole}
      onChange={handleChange}
      disabled={isPending}
      className="px-2 py-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] disabled:opacity-50"
    >
      {(["EDITOR", "VIEWER"] as UserRole[]).map(r => (
        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
      ))}
    </select>
  );
}
