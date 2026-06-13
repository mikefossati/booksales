import type { Plan } from "@/generated/prisma/client";

export type { Plan };

export type PlanFeature =
  | "unlimited_books"
  | "unlimited_channels"
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

export function hasFeature(
  account: AccountPlanFields,
  _feature: PlanFeature,
): boolean {
  return isProActive(account);
}
