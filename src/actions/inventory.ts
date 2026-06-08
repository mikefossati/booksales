"use server";

import { prisma } from "@/lib/prisma";
import { requireAccount } from "@/lib/auth";

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
  const auth = await requireAccount();
  if ("error" in auth) return auth;

  if (quantity < 1) return { error: "La cantidad debe ser mayor a 0." };

  const [bookOwned, channelOwned] = await Promise.all([
    prisma.book.findFirst({ where: { id: bookId, accountId: auth.account.id }, select: { id: true } }),
    prisma.channel.findFirst({ where: { id: channelId, accountId: auth.account.id }, select: { id: true } }),
  ]);
  if (!bookOwned || !channelOwned) return { error: "No encontrado." };

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
  const auth = await requireAccount();
  if ("error" in auth) return auth;

  if (quantity < 1) return { error: "La cantidad debe ser mayor a 0." };

  const bookOwned = await prisma.book.findFirst({
    where: { id: bookId, accountId: auth.account.id },
    select: { id: true },
  });
  if (!bookOwned) return { error: "No encontrado." };

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
