"use server";

import { prisma } from "@/lib/prisma";
import { ChannelType } from "@/generated/prisma/client";

export async function createChannel({
  accountId,
  name,
  type,
  royaltyPercent,
  consignmentPercent,
  currency,
  city,
}: {
  accountId: string;
  name: string;
  type: ChannelType;
  royaltyPercent?: number | null;
  consignmentPercent?: number | null;
  currency?: string | null;
  city?: string | null;
}): Promise<{ error?: string }> {
  if (!name.trim()) return { error: "El nombre es obligatorio." };

  try {
    await prisma.channel.create({
      data: {
        accountId,
        name: name.trim(),
        type,
        royaltyPercent:    royaltyPercent    ?? null,
        consignmentPercent: consignmentPercent ?? null,
        currency:          currency?.trim()   || null,
        city:              city?.trim()       || null,
      },
    });
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
  if (!name.trim()) return { error: "El nombre es obligatorio." };

  try {
    await prisma.channel.update({
      where: { id },
      data: {
        name: name.trim(),
        royaltyPercent:    royaltyPercent    ?? null,
        consignmentPercent: consignmentPercent ?? null,
        currency:          currency?.trim()   || null,
        city:              city?.trim()       || null,
      },
    });
    return {};
  } catch {
    return { error: "Error al guardar los cambios." };
  }
}

export async function deleteChannel(id: string): Promise<{ error?: string }> {
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
    return {};
  } catch {
    return { error: "Error al eliminar el canal. Inténtalo de nuevo." };
  }
}
