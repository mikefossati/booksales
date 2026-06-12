"use server";

import { prisma } from "@/lib/prisma";
import { requireAccount } from "@/lib/auth";

const KEY_PATTERN = /^[a-z-]+:[\w-]+(:[\w.-]+)?$/;

export async function dismissNotification(key: string): Promise<{ error?: string }> {
  const auth = await requireAccount();
  if ("error" in auth) return auth;

  if (!key || key.length > 200 || !KEY_PATTERN.test(key)) {
    return { error: "Notificación inválida." };
  }

  try {
    await prisma.notificationDismissal.upsert({
      where:  { accountId_key: { accountId: auth.account.id, key } },
      create: { accountId: auth.account.id, key },
      update: { dismissedAt: new Date() },
    });
    return {};
  } catch {
    return { error: "No se pudo ocultar la notificación. Inténtalo de nuevo." };
  }
}

export async function undoDismissNotification(key: string): Promise<{ error?: string }> {
  const auth = await requireAccount();
  if ("error" in auth) return auth;

  try {
    await prisma.notificationDismissal.deleteMany({
      where: { accountId: auth.account.id, key },
    });
    return {};
  } catch {
    return { error: "No se pudo restaurar la notificación." };
  }
}
