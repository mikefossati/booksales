"use server";

import { prisma } from "@/lib/prisma";

export async function sendToBookstore({
  bookId,
  channelId,
  quantity,
  notes,
}: {
  bookId: string;
  channelId: string;
  quantity: number;
  notes?: string;
}): Promise<{ error?: string }> {
  if (quantity < 1) return { error: "La cantidad debe ser mayor a 0." };

  try {
    await prisma.inventoryMovement.create({
      data: {
        bookId,
        channelId,
        type:       "SEND_TO_BOOKSTORE",
        quantity,
        notes:      notes?.trim() || null,
        occurredAt: new Date(),
      },
    });
    return {};
  } catch {
    return { error: "Error al registrar el movimiento." };
  }
}

export async function writeoffBook({
  bookId,
  quantity,
  notes,
}: {
  bookId: string;
  quantity: number;
  notes?: string;
}): Promise<{ error?: string }> {
  if (quantity < 1) return { error: "La cantidad debe ser mayor a 0." };

  try {
    await prisma.inventoryMovement.create({
      data: {
        bookId,
        type:       "WRITEOFF",
        quantity,
        notes:      notes?.trim() || null,
        occurredAt: new Date(),
      },
    });
    return {};
  } catch {
    return { error: "Error al registrar la baja." };
  }
}
