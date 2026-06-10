"use server";

import { prisma } from "@/lib/prisma";
import { updateTag } from "next/cache";
import { requireAccount } from "@/lib/auth";
import { resolveSaleDate } from "@/lib/dates";
import { calcInventoryStock, INVENTORY_SIGN } from "@/lib/finance";

export async function createInventory({ name }: { name: string }): Promise<{ error?: string }> {
  const auth = await requireAccount();
  if ("error" in auth) return auth;

  if (!name.trim()) return { error: "El nombre es obligatorio." };

  try {
    await prisma.inventory.create({
      data: { accountId: auth.account.id, name: name.trim() },
    });
    updateTag(`config-${auth.account.id}`);
    return {};
  } catch {
    return { error: "Error al crear el inventario." };
  }
}

export async function updateInventory({ id, name }: { id: string; name: string }): Promise<{ error?: string }> {
  const auth = await requireAccount();
  if ("error" in auth) return auth;

  if (!name.trim()) return { error: "El nombre es obligatorio." };

  const owned = await prisma.inventory.findFirst({
    where: { id, accountId: auth.account.id },
    select: { id: true },
  });
  if (!owned) return { error: "No encontrado." };

  try {
    await prisma.inventory.update({ where: { id }, data: { name: name.trim() } });
    updateTag(`config-${auth.account.id}`);
    return {};
  } catch {
    return { error: "Error al guardar los cambios." };
  }
}

export async function deleteInventory(id: string): Promise<{ error?: string }> {
  const auth = await requireAccount();
  if ("error" in auth) return auth;

  const inventory = await prisma.inventory.findFirst({
    where: { id, accountId: auth.account.id },
    select: { id: true, isDefault: true },
  });
  if (!inventory) return { error: "No encontrado." };
  if (inventory.isDefault) return { error: "No puedes eliminar el inventario principal." };

  // Block deletion while it still holds stock — transfer it out first
  const movements = await prisma.inventoryMovement.findMany({
    where:  { inventoryId: id },
    select: { bookId: true, inventoryId: true, type: true, quantity: true },
  });
  const hasStock = [...new Set(movements.map(m => m.bookId).filter(Boolean))].some(
    bookId => calcInventoryStock(movements, id, bookId as string) !== 0,
  );
  if (hasStock) {
    return { error: "Este inventario aún tiene existencias. Transfiérelas a otro inventario primero." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // History is preserved; movement rows keep existing with inventoryId = null
      await tx.inventoryMovement.updateMany({ where: { inventoryId: id }, data: { inventoryId: null } });
      await tx.inventory.delete({ where: { id } }); // channels: onDelete SetNull
    });
    updateTag(`config-${auth.account.id}`);
    updateTag(`txn-${auth.account.id}`);
    return {};
  } catch {
    return { error: "Error al eliminar el inventario." };
  }
}

export async function transferStock({
  bookId,
  fromInventoryId,
  toInventoryId,
  quantity,
  occurredAt,
  notes,
}: {
  bookId: string;
  fromInventoryId: string;
  toInventoryId: string;
  quantity: number;
  occurredAt?: string; // YYYY-MM-DD; omitted → today
  notes?: string;
}): Promise<{ error?: string }> {
  const auth = await requireAccount();
  if ("error" in auth) return auth;

  if (quantity < 1) return { error: "La cantidad debe ser mayor a 0." };
  if (fromInventoryId === toInventoryId) return { error: "El origen y el destino deben ser distintos." };

  const resolvedDate = resolveSaleDate(occurredAt);
  if (resolvedDate.error) return { error: resolvedDate.error };

  const [book, from, to] = await Promise.all([
    prisma.book.findFirst({ where: { id: bookId, accountId: auth.account.id }, select: { id: true } }),
    prisma.inventory.findFirst({ where: { id: fromInventoryId, accountId: auth.account.id }, select: { id: true } }),
    prisma.inventory.findFirst({ where: { id: toInventoryId, accountId: auth.account.id }, select: { id: true } }),
  ]);
  if (!book || !from || !to) return { error: "No encontrado." };

  try {
    const transferGroupId = crypto.randomUUID();
    await prisma.$transaction(async (tx) => {
      await tx.inventoryMovement.create({
        data: {
          bookId, type: "TRANSFER_OUT", quantity,
          inventoryId: fromInventoryId, transferGroupId,
          notes: notes?.trim() || null, occurredAt: resolvedDate.date,
        },
      });
      await tx.inventoryMovement.create({
        data: {
          bookId, type: "TRANSFER_IN", quantity,
          inventoryId: toInventoryId, transferGroupId,
          notes: notes?.trim() || null, occurredAt: resolvedDate.date,
        },
      });
    });
    updateTag(`txn-${auth.account.id}`);
    return {};
  } catch {
    return { error: "Error al registrar la transferencia." };
  }
}

/** Sets the physical count of a book in an inventory via a signed adjustment. */
export async function adjustStock({
  bookId,
  inventoryId,
  newCount,
  notes,
}: {
  bookId: string;
  inventoryId: string;
  newCount: number;
  notes?: string;
}): Promise<{ error?: string }> {
  const auth = await requireAccount();
  if ("error" in auth) return auth;

  if (newCount < 0 || !Number.isInteger(newCount)) {
    return { error: "El conteo debe ser un número entero positivo." };
  }

  const [book, inventory] = await Promise.all([
    prisma.book.findFirst({ where: { id: bookId, accountId: auth.account.id }, select: { id: true } }),
    prisma.inventory.findFirst({ where: { id: inventoryId, accountId: auth.account.id }, select: { id: true } }),
  ]);
  if (!book || !inventory) return { error: "No encontrado." };

  const movements = await prisma.inventoryMovement.findMany({
    where:  { inventoryId, bookId, type: { in: Object.keys(INVENTORY_SIGN) as never[] } },
    select: { bookId: true, inventoryId: true, type: true, quantity: true },
  });
  const current = calcInventoryStock(movements, inventoryId, bookId);
  const diff    = newCount - current;
  if (diff === 0) return {};

  try {
    await prisma.inventoryMovement.create({
      data: {
        bookId,
        inventoryId,
        type:       diff > 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT",
        quantity:   Math.abs(diff),
        notes:      notes?.trim() || `Ajuste de conteo físico (${current} → ${newCount})`,
        occurredAt: new Date(),
      },
    });
    updateTag(`txn-${auth.account.id}`);
    return {};
  } catch {
    return { error: "Error al registrar el ajuste." };
  }
}
