import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateAccount } from "@/lib/account";
import { prisma } from "@/lib/prisma";
import type { Account } from "@/generated/prisma/client";

export const IMPERSONATE_COOKIE = "x-admin-impersonate";

export type AuthResult =
  | { account: Account }
  | { error: string };

export async function requireAccount(): Promise<AuthResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado." };

  if (user.app_metadata?.role === "admin") {
    const cookieStore = await cookies();
    const impersonateId = cookieStore.get(IMPERSONATE_COOKIE)?.value;
    if (impersonateId) {
      const impersonated = await prisma.account.findUnique({ where: { id: impersonateId } });
      if (impersonated) return { account: impersonated };
    }
  }

  const account = await getOrCreateAccount(user.id, user.email ?? "");
  return { account };
}

/** Returns the impersonated accountId if the current admin session has one active. */
export async function getImpersonatedAccountId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "admin") return null;
  const cookieStore = await cookies();
  return cookieStore.get(IMPERSONATE_COOKIE)?.value ?? null;
}
