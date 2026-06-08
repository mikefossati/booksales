"use server";

import { prisma } from "@/lib/prisma";
import { updateTag } from "next/cache";
import { requireAccount } from "@/lib/auth";
import { ChannelType } from "@/generated/prisma/client";

export async function createChannel({
  name,
  type,
  royaltyPercent,
  consignmentPercent,
  currency,
  city,
  accountId: _ignored,
}: {
  name: string;
  type: ChannelType;
  royaltyPercent?: number | null;
  consignmentPercent?: number | null;
  currency?: string | null;
  city?: string | null;
  accountId?: string; // derived from session; caller value is ignored
}): Promise<{ error?: string }> {
  const auth = await requireAccount();
  if ("error" in auth) return auth;

  if (!name.trim()) return { error: "El nombre es obligatorio." };

  try {
    await prisma.channel.create({
      data: {
        accountId:          auth.account.id,
        name:               name.trim(),
        type,
        royaltyPercent:     royaltyPercent    ?? null,
        consignmentPercent: consignmentPercent ?? null,
        currency:           currency?.trim()   || null,
        city:               city?.trim()       || null,
      },
    });
    updateTag(`config-${auth.account.id}`);
    return {};
  } catch {
    return { error: "Error al guardar el canal. Inténtalo de nuevo." };
  }
}

export async function updateChannel({
  id,
  name,
  royaltyPercent,
  consignmentPercent,
  currency,
  city,
}: {
  id: string;
  name: string;
  royaltyPercent?: number | null;
  consignmentPercent?: number | null;
  currency?: string | null;
  city?: string | null;
}): Promise<{ error?: string }> {
  const auth = await requireAccount();
  if ("error" in auth) return auth;

  if (!name.trim()) return { error: "El nombre es obligatorio." };

  const owned = await prisma.channel.findFirst({
    where: { id, accountId: auth.account.id },
    select: { id: true },
  });
  if (!owned) return { error: "No encontrado." };

  try {
    await prisma.channel.update({
      where: { id },
      data: {
        name:               name.trim(),
        royaltyPercent:     royaltyPercent    ?? null,
        consignmentPercent: consignmentPercent ?? null,
        currency:           currency?.trim()   || null,
        city:               city?.trim()       || null,
      },
    });
    updateTag(`config-${auth.account.id}`);
    return {};
  } catch {
    return { error: "Error al guardar los cambios." };
  }
}

export async function deleteChannel(id: string): Promise<{ error?: string }> {
  const auth = await requireAccount();
  if ("error" in auth) return auth;

  const owned = await prisma.channel.findFirst({
    where: { id, accountId: auth.account.id },
    select: { id: true },
  });
  if (!owned) return { error: "No encontrado." };

  const [salesCount, paymentsCount] = await Promise.all([
    prisma.sale.count({ where: { channelId: id } }),
    prisma.payment.count({ where: { channelId: id } }),
  ]);

  if (salesCount > 0) {
    return {
      error: `Este canal tiene ${salesCount} venta${salesCount !== 1 ? "s" : ""} registrada${salesCount !== 1 ? "s" : ""}. Elimina esas ventas primero.`,
    };
  }
  if (paymentsCount > 0) {
    return {
      error: `Este canal tiene ${paymentsCount} cobro${paymentsCount !== 1 ? "s" : ""} registrado${paymentsCount !== 1 ? "s" : ""}. Elimínalos primero.`,
    };
  }

  try {
    await prisma.channel.delete({ where: { id } });
    updateTag(`config-${auth.account.id}`);
    return {};
  } catch {
    return { error: "Error al eliminar el canal. Inténtalo de nuevo." };
  }
}
