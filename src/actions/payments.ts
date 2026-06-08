"use server";

import { prisma } from "@/lib/prisma";
import { requireAccount } from "@/lib/auth";

export async function recordPayment({
  channelId,
  amount,
  currency,
  periodStart,
  periodEnd,
  receivedAt,
  notes,
}: {
  channelId: string;
  amount: number;
  currency: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;   // YYYY-MM-DD
  receivedAt: string;  // YYYY-MM-DD
  notes?: string;
}): Promise<{ error?: string }> {
  const auth = await requireAccount();
  if ("error" in auth) return auth;

  if (amount <= 0) return { error: "El monto debe ser mayor a 0." };

  const channelOwned = await prisma.channel.findFirst({
    where: { id: channelId, accountId: auth.account.id },
    select: { id: true },
  });
  if (!channelOwned) return { error: "No encontrado." };

  try {
    await prisma.payment.create({
      data: {
        channelId,
        amount:      amount.toFixed(2),
        currency,
        periodStart: new Date(periodStart + "T12:00:00"),
        periodEnd:   new Date(periodEnd   + "T12:00:00"),
        receivedAt:  new Date(receivedAt  + "T12:00:00"),
        notes:       notes?.trim() || null,
      },
    });
    return {};
  } catch {
    return { error: "Error al registrar el cobro." };
  }
}
