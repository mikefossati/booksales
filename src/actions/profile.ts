"use server";

import { prisma } from "@/lib/prisma";
import { requireAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile({
  profileId,
  displayName,
  avatarUrl,
}: {
  profileId: string;
  displayName: string;
  avatarUrl?: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado." };

  // Verify the profile belongs to the requesting user
  const profile = await prisma.profile.findFirst({
    where: { id: profileId, supabaseId: user.id },
    select: { id: true },
  });
  if (!profile) return { error: "No autorizado." };

  try {
    await prisma.profile.update({
      where: { id: profileId },
      data: {
        displayName: displayName.trim() || null,
        avatarUrl:   avatarUrl?.trim()   || null,
      },
    });
    return {};
  } catch {
    return { error: "Error al actualizar el perfil." };
  }
}

export async function updatePreferences({
  baseCurrency,
  dateFormat,
  accountId: _ignored,
}: {
  baseCurrency: string;
  dateFormat: string;
  accountId?: string; // derived from session; caller value is ignored
}): Promise<{ error?: string }> {
  const auth = await requireAccount();
  if ("error" in auth) return auth;

  try {
    await prisma.account.update({
      where: { id: auth.account.id },
      data: { baseCurrency, dateFormat },
    });
    return {};
  } catch {
    return { error: "Error al guardar las preferencias." };
  }
}
