"use server";

import { prisma } from "@/lib/prisma";
import { updateTag } from "next/cache";
import { requireAccount } from "@/lib/auth";
import { getOrCreateDefaultInventory } from "@/lib/inventory";

/**
 * Sends copies to a bookstore channel's inventory — a transfer from the
 * personal inventory to the channel's inventory.
 */
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

  const [bookOwned, channel] = await Promise.all([
    prisma.book.findFirst({ where: { id: bookId, accountId: auth.account.id }, select: { id: true } }),
    prisma.channel.findFirst({ where: { id: channelId, accountId: auth.account.id }, select: { id: true, inventoryId: true } }),
  ]);
  if (!bookOwned || !channel) return { error: "No encontrado." };
  if (!channel.inventoryId) return { error: "Este canal no tiene inventario asociado." };

  const defaultInventory = await getOrCreateDefaultInventory(auth.account.id);
  if (channel.inventoryId === defaultInventory.id) {
    return { error: "Este canal vende desde tu inventario personal — no hay nada que enviar." };
  }

  try {
    const transferGroupId = crypto.randomUUID();
    const occurredAt = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.inventoryMovement.create({
        data: {
          bookId, channelId, type: "TRANSFER_OUT", quantity,
          inventoryId: defaultInventory.id, transferGroupId,
          notes: notes?.trim() || null, occurredAt,
        },
      });
      await tx.inventoryMovement.create({
        data: {
          bookId, channelId, type: "TRANSFER_IN", quantity,
          inventoryId: channel.inventoryId, transferGroupId,
          notes: notes?.trim() || null, occurredAt,
        },
      });
    });
    updateTag(`txn-${auth.account.id}`);
    return {};
  } catch {
    return { error: "Error al registrar el movimiento." };
  }
}

export async function writeoffBook({
  bookId,
  quantity,
  inventoryId,
  notes,
}: {
  bookId: string;
  quantity: number;
  inventoryId?: string; // omitted → personal inventory
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

  let targetInventoryId: string;
  if (inventoryId) {
    const owned = await prisma.inventory.findFirst({
      where:  { id: inventoryId, accountId: auth.account.id },
      select: { id: true },
    });
    if (!owned) return { error: "Inventario no encontrado." };
    targetInventoryId = owned.id;
  } else {
    targetInventoryId = (await getOrCreateDefaultInventory(auth.account.id)).id;
  }

  try {
    await prisma.inventoryMovement.create({
      data: {
        bookId,
        type:        "WRITEOFF",
        quantity,
        inventoryId: targetInventoryId,
        notes:       notes?.trim() || null,
        occurredAt:  new Date(),
      },
    });
    updateTag(`txn-${auth.account.id}`);
    return {};
  } catch {
    return { error: "Error al registrar la baja." };
  }
}
