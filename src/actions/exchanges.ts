"use server";

import { prisma } from "@/lib/prisma";
import type { ExchangeStatus } from "@/generated/prisma/client";

export async function createExchange({
  accountId,
  bookId,
  recipient,
  quantity,
  sentAt,
  expectedResult,
  deadlineAt,
  notes,
}: {
  accountId: string;
  bookId: string;
  recipient: string;
  quantity: number;
  sentAt: string;
  expectedResult?: string;
  deadlineAt?: string;
  notes?: string;
}): Promise<{ error?: string }> {
  if (!recipient.trim()) return { error: "El destinatario es obligatorio." };
  if (quantity < 1)      return { error: "La cantidad debe ser mayor a 0." };

  const book = await prisma.book.findFirst({ where: { id: bookId, accountId } });
  if (!book) return { error: "Libro no encontrado." };

  const date = new Date(sentAt + "T12:00:00");

  try {
    await prisma.$transaction(async (tx) => {
      const exchange = await tx.exchange.create({
        data: {
          bookId,
          recipient:      recipient.trim(),
          quantity,
          sentAt:         date,
          expectedResult: expectedResult?.trim() || null,
          deadlineAt:     deadlineAt ? new Date(deadlineAt + "T12:00:00") : null,
          notes:          notes?.trim() || null,
        },
      });
      await tx.inventoryMovement.create({
        data: {
          bookId,
          exchangeId: exchange.id,
          type:       "SEND_TO_INFLUENCER",
          quantity,
          occurredAt: date,
        },
      });
    });
    return {};
  } catch {
    return { error: "Error al registrar el canje. Inténtalo de nuevo." };
  }
}

export async function updateExchange({
  id,
  recipient,
  expectedResult,
  deadlineAt,
  status,
  evidenceUrl,
  notes,
}: {
  id: string;
  recipient: string;
  expectedResult?: string;
  deadlineAt?: string;
  status: ExchangeStatus;
  evidenceUrl?: string;
  notes?: string;
}): Promise<{ error?: string }> {
  if (!recipient.trim()) return { error: "El destinatario es obligatorio." };

  try {
    await prisma.exchange.update({
      where: { id },
      data: {
        recipient:      recipient.trim(),
        expectedResult: expectedResult?.trim() || null,
        deadlineAt:     deadlineAt ? new Date(deadlineAt + "T12:00:00") : null,
        status,
        evidenceUrl:    evidenceUrl?.trim() || null,
        notes:          notes?.trim() || null,
      },
    });
    return {};
  } catch {
    return { error: "Error al actualizar el canje." };
  }
}

export async function deleteExchange(id: string): Promise<{ error?: string }> {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.inventoryMovement.deleteMany({ where: { exchangeId: id } });
      await tx.exchange.delete({ where: { id } });
    });
    return {};
  } catch {
    return { error: "Error al eliminar el canje." };
  }
}
