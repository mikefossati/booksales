import type { Plan } from "@/generated/prisma/client";

export type { Plan };

/**
 * Boolean-gated features. Limits (book count, channel count) are handled
 * separately via FREE_LIMITS — they are not feature flags.
 */
export type PlanFeature =
  | "payments"
  | "exports"
  | "merchandise"
  | "exchanges"
  | "reports_history";

export const FREE_LIMITS = {
  BOOKS: 1,
  CHANNELS: 3,
} as const;

type AccountPlanFields = { plan: Plan; planExpiresAt: Date | null };

export function isProActive(account: AccountPlanFields): boolean {
  if (account.plan !== "PRO") return false;
  if (!account.planExpiresAt) return true;
  return account.planExpiresAt > new Date();
}

/** All current boolean-gated features require an active Pro plan. */
const PRO_ONLY_FEATURES = new Set<PlanFeature>([
  "payments",
  "exports",
  "merchandise",
  "exchanges",
  "reports_history",
]);

export function hasFeature(
  account: AccountPlanFields,
  feature: PlanFeature,
): boolean {
  if (!PRO_ONLY_FEATURES.has(feature)) return true;
  return isProActive(account);
}
