"use server";

import { prisma } from "@/lib/prisma";

export async function updateProfile({
  profileId,
  displayName,
  avatarUrl,
}: {
  profileId: string;
  displayName: string;
  avatarUrl?: string;
}): Promise<{ error?: string }> {
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
  accountId,
  baseCurrency,
  dateFormat,
}: {
  accountId: string;
  baseCurrency: string;
  dateFormat: string;
}): Promise<{ error?: string }> {
  try {
    await prisma.account.update({
      where: { id: accountId },
      data: { baseCurrency, dateFormat },
    });
    return {};
  } catch {
    return { error: "Error al guardar las preferencias." };
  }
}
