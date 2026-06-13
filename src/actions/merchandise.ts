"use server";

import { prisma } from "@/lib/prisma";
import { updateTag } from "next/cache";
import { requireAccount } from "@/lib/auth";
import type { MerchandiseType } from "@/generated/prisma/client";
import { hasFeature } from "@/lib/plan";
import { calcCostPerUnit, resolvePricing } from "@/lib/finance";
import { resolveSaleDate } from "@/lib/dates";

// ── Products ──────────────────────────────────────────────────────────────────

export async function createMerchandise({
  name,
  type,
  suggestedPrice,
  category,
  bookId,
  edition,
  components,
  sku,
  description,
  accountId: _ignored,
}: {
  name: string;
  type: MerchandiseType;
  suggestedPrice?: number;
  category?: string;
  bookId?: string;
  edition?: string;
  components?: string[];
  sku?: string;
  description?: string;
  accountId?: string; // derived from session; caller value is ignored
}): Promise<{ error?: string }> {
  const auth = await requireAccount();
  if ("error" in auth) return auth;

  if (!hasFeature(auth.account, "merchandise")) {
    return { error: "La gestión de merchandising es una función Pro. Actualiza tu plan para usarla." };
  }

  if (!name.trim()) return { error: "El nombre es obligatorio." };

  try {
    await prisma.merchandise.create({
      data: {
        accountId:      auth.account.id,
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
    updateTag(`config-${auth.account.id}`);
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
  const auth = await requireAccount();
  if ("error" in auth) return auth;

  if (!name.trim()) return { error: "El nombre es obligatorio." };

  const owned = await prisma.merchandise.findFirst({
    where: { id, accountId: auth.account.id },
    select: { id: true },
  });
  if (!owned) return { error: "No encontrado." };

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
    updateTag(`config-${auth.account.id}`);
    return {};
  } catch {
    return { error: "Error al actualizar el producto." };
  }
}

export async function deleteMerchandise(id: string): Promise<{ error?: string }> {
  const auth = await requireAccount();
  if ("error" in auth) return auth;

  const owned = await prisma.merchandise.findFirst({
    where: { id, accountId: auth.account.id },
    select: { id: true },
  });
  if (!owned) return { error: "No encontrado." };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.sale.updateMany({ where: { merchandiseId: id }, data: { merchandiseId: null } });
      await tx.merchandise.delete({ where: { id } });
    });
    updateTag(`config-${auth.account.id}`);
    updateTag(`txn-${auth.account.id}`);
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
  const auth = await requireAccount();
  if ("error" in auth) return auth;

  if (quantity < 1)  return { error: "La cantidad debe ser mayor a 0." };
  if (totalCost < 0) return { error: "El costo no puede ser negativo." };

  const owned = await prisma.merchandise.findFirst({
    where: { id: merchandiseId, accountId: auth.account.id },
    select: { id: true },
  });
  if (!owned) return { error: "No encontrado." };

  const costPerUnit = calcCostPerUnit(totalCost, quantity);
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
    updateTag(`txn-${auth.account.id}`);
    return {};
  } catch {
    return { error: "Error al registrar el lote. Inténtalo de nuevo." };
  }
}

// ── Merch sales ───────────────────────────────────────────────────────────────

export async function createMerchSale({
  merchandiseId,
  channelId,
  quantity,
  unitPrice,
  totalAmount,
  isBulk = false,
  currency,
  fxRateToCLP,
  paymentMethod,
  saleDate,
}: {
  merchandiseId: string;
  channelId: string;
  quantity: number;
  unitPrice?: number;    // per-unit mode (default)
  totalAmount?: number;  // bulk mode: total entered directly
  isBulk?: boolean;
  currency: string;
  fxRateToCLP?: number;
  paymentMethod?: string;
  saleDate?: string; // YYYY-MM-DD; omitted → today
}): Promise<{ error?: string }> {
  const auth = await requireAccount();
  if ("error" in auth) return auth;

  if (quantity < 1) return { error: "La cantidad debe ser al menos 1." };

  const pricing = resolvePricing({ isBulk, unitPrice, totalAmount, quantity });
  if ("error" in pricing) return pricing;

  const resolvedDate = resolveSaleDate(saleDate);
  if (resolvedDate.error) return { error: resolvedDate.error };

  const [channelOwned, merchOwned] = await Promise.all([
    prisma.channel.findFirst({ where: { id: channelId, accountId: auth.account.id }, select: { id: true } }),
    prisma.merchandise.findFirst({ where: { id: merchandiseId, accountId: auth.account.id }, select: { id: true } }),
  ]);
  if (!channelOwned || !merchOwned) return { error: "No encontrado." };

  const amountCLP = fxRateToCLP != null ? pricing.total * fxRateToCLP : currency === "CLP" ? pricing.total : null;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.sale.create({
        data: {
          merchandiseId,
          channelId,
          quantity,
          unitPrice:     pricing.unit.toFixed(2),
          totalAmount:   pricing.total.toFixed(2),
          isBulk,
          currency,
          fxRateToCLP:   fxRateToCLP != null ? fxRateToCLP.toFixed(6) : null,
          amountCLP:     amountCLP != null ? amountCLP.toFixed(2) : null,
          paymentMethod: paymentMethod ?? null,
          status:        "CONFIRMED",
          origin:        "manual",
          saleDate:      resolvedDate.date,
        },
      });
      await tx.inventoryMovement.create({
        data: {
          merchandiseId,
          channelId,
          type:       "MERCHANDISE_SALE",
          quantity,
          occurredAt: resolvedDate.date,
        },
      });
    });
    updateTag(`txn-${auth.account.id}`);
    return {};
  } catch {
    return { error: "Error al registrar la venta. Inténtalo de nuevo." };
  }
}
