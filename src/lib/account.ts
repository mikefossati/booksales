import { prisma } from "@/lib/prisma";
import type { Account } from "@/generated/prisma/client";

type ProfileWithAccounts = Awaited<ReturnType<typeof findProfile>>;

function findProfile(userId: string) {
  return prisma.profile.findUnique({
    where:   { supabaseId: userId },
    include: { ownedAccounts: { take: 1 } },
  });
}

/**
 * Returns the Account for the given Supabase user, creating the Profile and
 * Account rows on first login. Uses findUnique + create instead of upsert to
 * avoid the race condition that occurs with pgBouncer in transaction mode
 * (Prisma's upsert is not atomic — it is a SELECT then INSERT, so two
 * concurrent requests on first login both see "no record" and the second
 * INSERT fails with P2002).
 */
export async function getOrCreateAccount(
  userId: string,
  email:  string,
): Promise<Account> {
  // ── 1. Find existing profile ──────────────────────────────────────────────
  let profile: ProfileWithAccounts = await findProfile(userId);

  // ── 2. Create profile if missing (with P2002 race-condition guard) ────────
  if (!profile) {
    try {
      profile = await prisma.profile.create({
        data:    { supabaseId: userId, email },
        include: { ownedAccounts: { take: 1 } },
      });
    } catch (err: unknown) {
      if ((err as { code?: string }).code === "P2002") {
        // Another concurrent request created the profile — fetch it
        profile = await findProfile(userId);
      } else {
        throw err;
      }
    }
  }

  if (!profile) throw new Error("Failed to resolve profile for user " + userId);

  // ── 3. Return existing account ────────────────────────────────────────────
  if (profile.ownedAccounts.length > 0) return profile.ownedAccounts[0];

  // ── 4. Create account if missing (with P2002 race-condition guard) ────────
  try {
    return await prisma.account.create({
      data: { ownerId: profile.id, baseCurrency: "CLP", dateFormat: "DD/MM/YYYY" },
    });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2002") {
      const updated = await findProfile(userId);
      if (updated?.ownedAccounts[0]) return updated.ownedAccounts[0];
    }
    throw err;
  }
}
