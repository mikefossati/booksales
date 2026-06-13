"use server";

import { prisma } from "@/lib/prisma";
import { updateTag } from "next/cache";
import { requireAccount } from "@/lib/auth";
import { hasFeature } from "@/lib/plan";

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
  periodStart?: string; // YYYY-MM-DD — settlement window (optional, both or none)
  periodEnd?: string;   // YYYY-MM-DD
  receivedAt: string;   // YYYY-MM-DD
  notes?: string;
}): Promise<{ error?: string }> {
  const auth = await requireAccount();
  if ("error" in auth) return auth;

  if (!hasFeature(auth.account, "payments")) {
    return { error: "El registro de cobros es una función Pro. Actualiza tu plan para usarla." };
  }

  if (amount <= 0) return { error: "El monto debe ser mayor a 0." };
  if (Boolean(periodStart) !== Boolean(periodEnd)) {
    return { error: "Completa ambas fechas del período o quítalo." };
  }
  if (periodStart && periodEnd && periodStart > periodEnd) {
    return { error: "El inicio del período no puede ser posterior al fin." };
  }

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
        periodStart: periodStart ? new Date(periodStart + "T12:00:00") : null,
        periodEnd:   periodEnd   ? new Date(periodEnd   + "T12:00:00") : null,
        receivedAt:  new Date(receivedAt  + "T12:00:00"),
        notes:       notes?.trim() || null,
      },
    });
    updateTag(`txn-${auth.account.id}`);
    return {};
  } catch {
    return { error: "Error al registrar el cobro." };
  }
}
