import { createClient } from "@/lib/supabase/server";
import { getOrCreateAccount } from "@/lib/account";
import type { Account } from "@/generated/prisma/client";

export type AuthResult =
  | { account: Account }
  | { error: string };

export async function requireAccount(): Promise<AuthResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado." };
  const account = await getOrCreateAccount(user.id, user.email ?? "");
  return { account };
}
