import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateAccount } from "@/lib/account";
import { toNum } from "@/lib/format";
import { getCachedLayoutData } from "@/lib/data-cache";
import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";
import QuickSaleFab from "@/components/layout/QuickSaleFab";
import { Toaster } from "@/components/ui/sonner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const account = await getOrCreateAccount(user.id, user.email ?? "");

  if (!account.onboardingCompletedAt) {
    const headersList = await headers();
    const currentPath = headersList.get("x-current-path") ?? "/dashboard";
    if (!currentPath.startsWith("/onboarding")) redirect("/onboarding");
  }

  const { books, merch, channels, lastBookSales, lastMerchSales } =
    await getCachedLayoutData(account.id);

  // Build price maps: `${itemId}_${channelId}` → last unit price
  const lastPrices: Record<string, number> = {};
  for (const s of lastBookSales) {
    if (!s.bookId) continue;
    const key = `${s.bookId}_${s.channelId}`;
    if (!(key in lastPrices)) lastPrices[key] = toNum(s.unitPrice);
  }
  const merchLastPrices: Record<string, number> = {};
  for (const s of lastMerchSales) {
    if (!s.merchandiseId) continue;
    const key = `${s.merchandiseId}_${s.channelId}`;
    if (!(key in merchLastPrices)) merchLastPrices[key] = toNum(s.unitPrice);
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Sidebar userEmail={user.email ?? ""} />
      <div className="md:pl-60 pb-16 md:pb-0">
        {children}
      </div>
      <BottomNav />
      <QuickSaleFab
        accountId={account.id}
        accountCurrency={account.baseCurrency}
        books={books}
        merch={merch}
        channels={channels}
        lastPrices={lastPrices}
        merchLastPrices={merchLastPrices}
      />
      <Toaster position="bottom-center" />
    </div>
  );
}
