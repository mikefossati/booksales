"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateAccountPlan } from "@/actions/admin";
import type { Plan } from "@/generated/prisma/client";
import { CheckCircle2 } from "lucide-react";

interface Props {
  accountId:     string;
  currentPlan:   Plan;
  planExpiresAt: Date | null;
}

export default function AccountPlanForm({ accountId, currentPlan, planExpiresAt }: Props) {
  const [plan, setPlan]             = useState<Plan>(currentPlan);
  const [expiresAt, setExpiresAt]   = useState<string>(
    planExpiresAt ? planExpiresAt.toISOString().split("T")[0] : "",
  );
  const [error,   setError]         = useState<string | null>(null);
  const [saved,   setSaved]         = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    startTransition(async () => {
      const result = await updateAccountPlan({
        accountId,
        plan,
        planExpiresAt: expiresAt.trim() || null,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Plan selector */}
      <div className="flex gap-3">
        {(["FREE", "PRO"] as Plan[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => { setPlan(p); setSaved(false); }}
            className={`flex-1 py-2.5 rounded-[var(--radius-md)] text-sm font-medium border transition-colors ${
              plan === p
                ? p === "PRO"
                  ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]"
                  : "bg-[var(--color-secondary)] text-white border-[var(--color-secondary)]"
                : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Expiry date */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[var(--color-text)]">
          Vencimiento{" "}
          <span className="font-normal text-[var(--color-text-muted)]">(vacío = lifetime)</span>
        </label>
        <input
          type="date"
          value={expiresAt}
          onChange={(e) => { setExpiresAt(e.target.value); setSaved(false); }}
          disabled={plan === "FREE"}
          className="w-full px-3 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 disabled:opacity-40 disabled:cursor-not-allowed"
        />
        {plan === "FREE" && (
          <p className="text-xs text-[var(--color-text-muted)]">El plan Free no tiene vencimiento.</p>
        )}
      </div>

      {error && (
        <p className="text-sm text-[var(--color-danger)] bg-[var(--color-danger)]/8 rounded-[var(--radius-sm)] px-3 py-2">
          {error}
        </p>
      )}

      {saved && (
        <p className="flex items-center gap-1.5 text-sm text-[var(--color-success)]">
          <CheckCircle2 size={15} />
          Plan actualizado correctamente.
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2.5 rounded-[var(--radius-md)] text-sm font-medium bg-[var(--color-accent)] text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {isPending ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
