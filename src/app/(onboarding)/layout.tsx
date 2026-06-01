import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateAccount } from "@/lib/account";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Already completed onboarding — skip to app
  const account = await getOrCreateAccount(user.id, user.email ?? "");
  if (account.onboardingCompletedAt) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      {children}
    </div>
  );
}
