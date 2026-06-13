import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateAccount } from "@/lib/account";
import { prisma } from "@/lib/prisma";
import { IMPERSONATE_COOKIE } from "@/lib/auth";
import { toNum } from "@/lib/format";
import { getCachedLayoutData } from "@/lib/data-cache";
import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";
import QuickSaleFab from "@/components/layout/QuickSaleFab";
import ImpersonationBanner from "@/components/admin/ImpersonationBanner";
import { Toaster } from "@/components/ui/sonner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Admin impersonation: use the target account instead of the admin's own account
  const isAdmin = user.app_metadata?.role === "admin";
  const cookieStore = await cookies();
  const impersonateId = isAdmin ? cookieStore.get(IMPERSONATE_COOKIE)?.value : undefined;

  const account = impersonateId
    ? (await prisma.account.findUnique({
        where:   { id: impersonateId },
        include: { owner: { select: { email: true } } },
      })) ?? await getOrCreateAccount(user.id, user.email ?? "")
    : await getOrCreateAccount(user.id, user.email ?? "");

  // Skip onboarding redirect when impersonating
  if (!impersonateId && !account.onboardingCompletedAt) {
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

  const impersonatedEmail =
    impersonateId && "owner" in account
      ? (account as typeof account & { owner: { email: string } }).owner.email
      : null;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {impersonatedEmail && <ImpersonationBanner email={impersonatedEmail} accountId={impersonateId!} />}
      <Sidebar userEmail={user.email ?? ""} />
      <div className="md:pl-60 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0">
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
