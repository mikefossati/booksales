"use server";

import { prisma } from "@/lib/prisma";
import { updateTag } from "next/cache";
import { requireAccount } from "@/lib/auth";
import { getOrCreateDefaultInventory } from "@/lib/inventory";
import { calcCostPerUnit } from "@/lib/finance";

export async function addPrintRun({
  bookId,
  quantity,
  totalCost,
  supplier,
  receivedAt,
  notes,
  inventoryId,
}: {
  bookId: string;
  quantity: number;
  totalCost: number;
  supplier?: string;
  receivedAt: string; // YYYY-MM-DD
  notes?: string;
  inventoryId?: string; // destination; omitted → personal inventory
}): Promise<{ error?: string }> {
  const auth = await requireAccount();
  if ("error" in auth) return auth;

  if (quantity < 1)  return { error: "La cantidad debe ser mayor a 0." };
  if (totalCost < 0) return { error: "El costo no puede ser negativo." };

  const bookOwned = await prisma.book.findFirst({
    where: { id: bookId, accountId: auth.account.id },
    select: { id: true },
  });
  if (!bookOwned) return { error: "No encontrado." };

  let destinationId: string;
  if (inventoryId) {
    const owned = await prisma.inventory.findFirst({
      where:  { id: inventoryId, accountId: auth.account.id },
      select: { id: true },
    });
    if (!owned) return { error: "Inventario no encontrado." };
    destinationId = owned.id;
  } else {
    destinationId = (await getOrCreateDefaultInventory(auth.account.id)).id;
  }

  const costPerUnit = calcCostPerUnit(totalCost, quantity);
  const date = new Date(receivedAt + "T12:00:00");

  try {
    await prisma.$transaction(async (tx) => {
      const run = await tx.printRun.create({
        data: {
          bookId,
          quantity,
          totalCost:   totalCost.toFixed(2),
          costPerUnit: costPerUnit.toFixed(4),
          supplier:    supplier?.trim() || null,
          receivedAt:  date,
          notes:       notes?.trim()    || null,
        },
      });
      await tx.inventoryMovement.create({
        data: {
          bookId,
          printRunId:  run.id,
          type:        "NEW_PRINT_RUN",
          quantity,
          inventoryId: destinationId,
          occurredAt:  date,
        },
      });
    });
    updateTag(`txn-${auth.account.id}`);
    return {};
  } catch {
    return { error: "Error al guardar la tirada. Inténtalo de nuevo." };
  }
}

export async function updatePrintRun({
  id,
  quantity,
  totalCost,
  supplier,
  receivedAt,
  notes,
}: {
  id: string;
  quantity: number;
  totalCost: number;
  supplier?: string;
  receivedAt: string;
  notes?: string;
}): Promise<{ error?: string }> {
  const auth = await requireAccount();
  if ("error" in auth) return auth;

  if (quantity < 1)  return { error: "La cantidad debe ser mayor a 0." };
  if (totalCost < 0) return { error: "El costo no puede ser negativo." };

  const owned = await prisma.printRun.findFirst({
    where: { id, book: { accountId: auth.account.id } },
    select: { id: true },
  });
  if (!owned) return { error: "No encontrado." };

  const costPerUnit = calcCostPerUnit(totalCost, quantity);
  const date = new Date(receivedAt + "T12:00:00");

  try {
    await prisma.$transaction(async (tx) => {
      await tx.printRun.update({
        where: { id },
        data: {
          quantity,
          totalCost:   totalCost.toFixed(2),
          costPerUnit: costPerUnit.toFixed(4),
          supplier:    supplier?.trim() || null,
          receivedAt:  date,
          notes:       notes?.trim() || null,
        },
      });
      await tx.inventoryMovement.updateMany({
        where: { printRunId: id, type: "NEW_PRINT_RUN" },
        data:  { quantity, occurredAt: date },
      });
    });
    updateTag(`txn-${auth.account.id}`);
    return {};
  } catch {
    return { error: "Error al actualizar la tirada. Inténtalo de nuevo." };
  }
}
