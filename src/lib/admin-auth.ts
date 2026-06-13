import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type AdminAuthResult =
  | { userId: string; email: string }
  | { error: string };

/**
 * Verifies the current session has app_metadata.role === "admin".
 * Call at the top of every admin server component or server action.
 * Redirects to "/" on failure (not 401, to avoid leaking route existence).
 */
export async function requireAdmin(): Promise<{ userId: string; email: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "admin") {
    redirect("/");
  }

  return { userId: user.id, email: user.email ?? "" };
}

/**
 * Returns true if the current user has the admin role.
 * Safe to call in server components that want to conditionally render.
 */
export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.app_metadata?.role === "admin";
}
