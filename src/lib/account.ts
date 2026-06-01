import { prisma } from "@/lib/prisma";
import type { Account } from "@/generated/prisma/client";

export async function getOrCreateAccount(
  userId: string,
  email: string
): Promise<Account> {
  // upsert is atomic — safe under concurrent requests on first login
  const profile = await prisma.profile.upsert({
    where: { supabaseId: userId },
    create: { supabaseId: userId, email },
    update: {},
    include: { ownedAccounts: { take: 1 } },
  });

  if (profile.ownedAccounts.length > 0) {
    return profile.ownedAccounts[0];
  }

  return prisma.account.create({
    data: { ownerId: profile.id, baseCurrency: "CLP", dateFormat: "DD/MM/YYYY" },
  });
}
