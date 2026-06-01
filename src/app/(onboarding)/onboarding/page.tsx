import { createClient } from "@/lib/supabase/server";
import { getOrCreateAccount } from "@/lib/account";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const account = await getOrCreateAccount(user.id, user.email ?? "");

  return <OnboardingWizard accountId={account.id} />;
}
