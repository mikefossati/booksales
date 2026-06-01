"use server";

import { prisma } from "@/lib/prisma";
import { calcCostPerUnit, calcSaleTotal } from "@/lib/finance";

export async function addPrintRun({
  bookId,
  quantity,
  totalCost,
  supplier,
  receivedAt,
  notes,
}: {
  bookId: string;
  quantity: number;
  totalCost: number;
  supplier?: string;
  receivedAt: string; // YYYY-MM-DD from date input
  notes?: string;
}): Promise<{ error?: string }> {
  if (quantity < 1)   return { error: "La cantidad debe ser mayor a 0." };
  if (totalCost < 0)  return { error: "El costo no puede ser negativo." };

  const costPerUnit = calcCostPerUnit(totalCost, quantity);
  const date = new Date(receivedAt + "T12:00:00"); // noon local avoids UTC-day-shift

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
          printRunId: run.id,
          type:       "NEW_PRINT_RUN",
          quantity,
          occurredAt: date,
        },
      });
    });
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
  if (quantity < 1)  return { error: "La cantidad debe ser mayor a 0." };
  if (totalCost < 0) return { error: "El costo no puede ser negativo." };

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
    return {};
  } catch {
    return { error: "Error al actualizar la tirada. Inténtalo de nuevo." };
  }
}
