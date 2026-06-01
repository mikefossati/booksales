"use server";

import { prisma } from "@/lib/prisma";
import type { MerchandiseType } from "@/generated/prisma/client";

// ── Products ──────────────────────────────────────────────────────────────────

export async function createMerchandise({
  accountId,
  name,
  type,
  suggestedPrice,
  category,
  bookId,
  edition,
  components,
  sku,
  description,
}: {
  accountId: string;
  name: string;
  type: MerchandiseType;
  suggestedPrice?: number;
  category?: string;
  bookId?: string;
  edition?: string;
  components?: string[];
  sku?: string;
  description?: string;
}): Promise<{ error?: string }> {
  if (!name.trim()) return { error: "El nombre es obligatorio." };

  try {
    await prisma.merchandise.create({
      data: {
        accountId,
        name:           name.trim(),
        type,
        suggestedPrice: suggestedPrice != null ? suggestedPrice.toFixed(2) : null,
        category:       category?.trim()    || null,
        bookId:         bookId              || null,
        edition:        edition?.trim()     || null,
        components:     components?.length  ? (components as unknown as object) : undefined,
        sku:            sku?.trim()         || null,
        description:    description?.trim() || null,
      },
    });
    return {};
  } catch {
    return { error: "Error al crear el producto. Inténtalo de nuevo." };
  }
}

export async function updateMerchandise({
  id,
  name,
  type,
  suggestedPrice,
  category,
  bookId,
  edition,
  components,
  sku,
  description,
  isActive,
}: {
  id: string;
  name: string;
  type: MerchandiseType;
  suggestedPrice?: number;
  category?: string;
  bookId?: string;
  edition?: string;
  components?: string[];
  sku?: string;
  description?: string;
  isActive: boolean;
}): Promise<{ error?: string }> {
  if (!name.trim()) return { error: "El nombre es obligatorio." };

  try {
    await prisma.merchandise.update({
      where: { id },
      data: {
        name:           name.trim(),
        type,
        isActive,
        suggestedPrice: suggestedPrice != null ? suggestedPrice.toFixed(2) : null,
        category:       category?.trim()    || null,
        bookId:         bookId              || null,
        edition:        edition?.trim()     || null,
        components:     components?.length  ? (components as unknown as object) : undefined,
        sku:            sku?.trim()         || null,
        description:    description?.trim() || null,
      },
    });
    return {};
  } catch {
    return { error: "Error al actualizar el producto." };
  }
}

export async function deleteMerchandise(id: string): Promise<{ error?: string }> {
  try {
    await prisma.$transaction(async (tx) => {
      // Null out merch reference on sales so history is preserved
      await tx.sale.updateMany({ where: { merchandiseId: id }, data: { merchandiseId: null } });
      await tx.merchandise.delete({ where: { id } });
    });
    return {};
  } catch {
    return { error: "Error al eliminar el producto." };
  }
}

// ── Production batches ────────────────────────────────────────────────────────

export async function addProductionBatch({
  merchandiseId,
  quantity,
  totalCost,
  supplier,
  receivedAt,
}: {
  merchandiseId: string;
  quantity: number;
  totalCost: number;
  supplier?: string;
  receivedAt: string;
}): Promise<{ error?: string }> {
  if (quantity < 1)  return { error: "La cantidad debe ser mayor a 0." };
  if (totalCost < 0) return { error: "El costo no puede ser negativo." };

  const costPerUnit = quantity > 0 ? totalCost / quantity : 0;
  const date = new Date(receivedAt + "T12:00:00");

  try {
    await prisma.$transaction(async (tx) => {
      await tx.productionBatch.create({
        data: {
          merchandiseId,
          quantity,
          totalCost:   totalCost.toFixed(2),
          costPerUnit: costPerUnit.toFixed(4),
          supplier:    supplier?.trim() || null,
          receivedAt:  date,
        },
      });
      await tx.inventoryMovement.create({
        data: {
          merchandiseId,
          type:       "MERCHANDISE_ENTRY",
          quantity,
          occurredAt: date,
        },
      });
    });
    return {};
  } catch {
    return { error: "Error al registrar el lote. Inténtalo de nuevo." };
  }
}

// ── Merch sales (called from QuickSaleFab) ────────────────────────────────────

export async function createMerchSale({
  merchandiseId,
  channelId,
  quantity,
  unitPrice,
  currency,
  paymentMethod,
}: {
  merchandiseId: string;
  channelId: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  paymentMethod?: string;
}): Promise<{ error?: string }> {
  if (quantity < 1)  return { error: "La cantidad debe ser al menos 1." };
  if (unitPrice < 0) return { error: "El precio no puede ser negativo." };

  const total = quantity * unitPrice;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.sale.create({
        data: {
          merchandiseId,
          channelId,
          quantity,
          unitPrice:     unitPrice.toFixed(2),
          totalAmount:   total.toFixed(2),
          currency,
          paymentMethod: paymentMethod ?? null,
          status:        "CONFIRMED",
          origin:        "manual",
        },
      });
      await tx.inventoryMovement.create({
        data: {
          merchandiseId,
          channelId,
          type:       "MERCHANDISE_SALE",
          quantity,
          occurredAt: new Date(),
        },
      });
    });
    return {};
  } catch {
    return { error: "Error al registrar la venta. Inténtalo de nuevo." };
  }
}
