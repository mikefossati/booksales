"use server";

import { prisma } from "@/lib/prisma";
import { requireAccount } from "@/lib/auth";
import type { UserRole } from "@/generated/prisma/client";

export async function inviteUserByEmail({
  email,
  role,
  accountId: _ignored,
}: {
  email: string;
  role: UserRole;
  accountId?: string; // derived from session; caller value is ignored
}): Promise<{ error?: string }> {
  const auth = await requireAccount();
  if ("error" in auth) return auth;

  const accountId = auth.account.id;

  if (!email.trim()) return { error: "El correo es obligatorio." };

  const [profile, account] = await Promise.all([
    prisma.profile.findUnique({ where: { email: email.trim().toLowerCase() } }),
    prisma.account.findUnique({ where: { id: accountId }, select: { ownerId: true } }),
  ]);

  if (!profile)  return { error: "No se encontró ninguna cuenta con ese correo. Pídele que se registre primero." };
  if (account?.ownerId === profile.id) return { error: "Este usuario ya es propietario de la cuenta." };

  const existing = await prisma.accountMember.findUnique({
    where: { accountId_profileId: { accountId, profileId: profile.id } },
  });
  if (existing) return { error: "Este usuario ya tiene acceso a tu cuenta." };

  try {
    await prisma.accountMember.create({
      data: { accountId, profileId: profile.id, role },
    });
    return {};
  } catch {
    return { error: "Error al agregar el usuario." };
  }
}

export async function updateMemberRole({
  memberId,
  role,
}: {
  memberId: string;
  role: UserRole;
}): Promise<{ error?: string }> {
  const auth = await requireAccount();
  if ("error" in auth) return auth;

  const owned = await prisma.accountMember.findFirst({
    where: { id: memberId, accountId: auth.account.id },
    select: { id: true },
  });
  if (!owned) return { error: "No encontrado." };

  try {
    await prisma.accountMember.update({ where: { id: memberId }, data: { role } });
    return {};
  } catch {
    return { error: "Error al cambiar el rol." };
  }
}

export async function revokeMember(memberId: string): Promise<{ error?: string }> {
  const auth = await requireAccount();
  if ("error" in auth) return auth;

  const owned = await prisma.accountMember.findFirst({
    where: { id: memberId, accountId: auth.account.id },
    select: { id: true },
  });
  if (!owned) return { error: "No encontrado." };

  try {
    await prisma.accountMember.delete({ where: { id: memberId } });
    return {};
  } catch {
    return { error: "Error al revocar el acceso." };
  }
}
