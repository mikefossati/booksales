"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { IMPERSONATE_COOKIE } from "@/lib/auth";
import type { Plan } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";

export async function updateAccountPlan({
  accountId,
  plan,
  planExpiresAt,
}: {
  accountId:     string;
  plan:          Plan;
  planExpiresAt: string | null; // ISO date string "YYYY-MM-DD" or null (lifetime)
}): Promise<{ error?: string }> {
  await requireAdmin();

  const account = await prisma.account.findUnique({
    where:  { id: accountId },
    select: { id: true },
  });
  if (!account) return { error: "Cuenta no encontrada." };

  let expiresAt: Date | null = null;
  if (planExpiresAt) {
    expiresAt = new Date(planExpiresAt + "T23:59:59");
    if (isNaN(expiresAt.getTime())) return { error: "Fecha inválida." };
  }

  await prisma.account.update({
    where: { id: accountId },
    data:  { plan, planExpiresAt: expiresAt },
  });

  revalidatePath(`/admin/accounts/${accountId}`);
  revalidatePath("/admin/accounts");
  return {};
}

export async function startImpersonation(accountId: string): Promise<{ error?: string }> {
  await requireAdmin();

  const account = await prisma.account.findUnique({
    where:  { id: accountId },
    select: { id: true },
  });
  if (!account) return { error: "Cuenta no encontrada." };

  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATE_COOKIE, accountId, {
    httpOnly: true,
    path:     "/",
    sameSite: "lax",
    maxAge:   60 * 60 * 8, // 8 hours
  });
  return {};
}

export async function stopImpersonation(): Promise<void> {
  await requireAdmin();
  const cookieStore = await cookies();
  cookieStore.delete(IMPERSONATE_COOKIE);
}
