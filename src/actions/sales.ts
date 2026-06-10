"use server";

import { prisma } from "@/lib/prisma";
import { updateTag } from "next/cache";
import { requireAccount } from "@/lib/auth";
import { SaleStatus } from "@/generated/prisma/client";
import { resolvePricing } from "@/lib/finance";
import { resolveSaleDate } from "@/lib/dates";

export async function createSale({
  bookId,
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
  bookId: string;
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

  const channel = await prisma.channel.findFirst({
    where: { id: channelId, accountId: auth.account.id },
    select: { id: true, inventoryId: true },
  });
  if (!channel) return { error: "No encontrado." };

  let bookFormats: string[] = [];
  if (bookId) {
    const book = await prisma.book.findFirst({
      where: { id: bookId, accountId: auth.account.id },
      select: { id: true, formats: true },
    });
    if (!book) return { error: "No encontrado." };
    bookFormats = book.formats;
  }

  const amountCLP = fxRateToCLP != null ? pricing.total * fxRateToCLP : currency === "CLP" ? pricing.total : null;
  // Deduct stock when the channel sells from an inventory and the book is physical
  const deductInventoryId =
    channel.inventoryId && bookFormats.includes("PRINT") ? channel.inventoryId : null;

  try {
    await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          bookId,
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

      if (deductInventoryId) {
        await tx.inventoryMovement.create({
          data: {
            bookId,
            type:        "DIRECT_SALE",
            quantity,
            inventoryId: deductInventoryId,
            saleId:      sale.id,
            channelId,
            occurredAt:  resolvedDate.date,
          },
        });
      }
    });
    updateTag(`txn-${auth.account.id}`);
    return {};
  } catch {
    return { error: "Error al registrar la venta. Inténtalo de nuevo." };
  }
}

export async function updateSale({
  id,
  quantity,
  unitPrice,
  totalAmount,
  isBulk = false,
  channelId,
  saleDate,
  fxRateToCLP,
  paymentMethod,
  status,
  notes,
}: {
  id: string;
  quantity: number;
  unitPrice?: number;    // per-unit mode (default)
  totalAmount?: number;  // bulk mode: total entered directly
  isBulk?: boolean;
  channelId: string;
  saleDate: string;
  fxRateToCLP?: number | null;
  paymentMethod?: string;
  status: SaleStatus;
  notes?: string;
}): Promise<{ error?: string }> {
  const auth = await requireAccount();
  if ("error" in auth) return auth;

  if (quantity < 1) return { error: "La cantidad debe ser al menos 1." };

  const pricing = resolvePricing({ isBulk, unitPrice, totalAmount, quantity });
  if ("error" in pricing) return pricing;

  const owned = await prisma.sale.findFirst({
    where:   { id, channel: { accountId: auth.account.id } },
    select:  { id: true, currency: true, bookId: true, book: { select: { formats: true } } },
  });
  if (!owned) return { error: "No encontrado." };

  const targetChannel = await prisma.channel.findFirst({
    where:  { id: channelId, accountId: auth.account.id },
    select: { id: true, inventoryId: true },
  });
  if (!targetChannel) return { error: "No encontrado." };

  const currency  = owned.currency;
  const rate      = fxRateToCLP !== undefined ? fxRateToCLP : null;
  const amountCLP = rate != null ? pricing.total * rate : currency === "CLP" ? pricing.total : null;

  // Recreate the stock deduction from the sale's new state
  const deductInventoryId =
    status !== "CANCELLED" &&
    owned.bookId &&
    targetChannel.inventoryId &&
    (owned.book?.formats ?? []).includes("PRINT")
      ? targetChannel.inventoryId
      : null;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.sale.update({
        where: { id },
        data: {
          quantity,
          unitPrice:     pricing.unit.toFixed(2),
          totalAmount:   pricing.total.toFixed(2),
          isBulk,
          channelId,
          saleDate:      new Date(saleDate + "T12:00:00"),
          fxRateToCLP:   rate != null ? rate.toFixed(6) : null,
          amountCLP:     amountCLP != null ? amountCLP.toFixed(2) : null,
          paymentMethod: paymentMethod || null,
          status,
          notes:         notes?.trim() || null,
          currency,
        },
      });

      await tx.inventoryMovement.deleteMany({ where: { saleId: id } });
      if (deductInventoryId) {
        await tx.inventoryMovement.create({
          data: {
            bookId:      owned.bookId,
            type:        "DIRECT_SALE",
            quantity,
            inventoryId: deductInventoryId,
            saleId:      id,
            channelId,
            occurredAt:  new Date(saleDate + "T12:00:00"),
          },
        });
      }
    });
    updateTag(`txn-${auth.account.id}`);
    return {};
  } catch {
    return { error: "Error al actualizar la venta." };
  }
}

export async function deleteSale(id: string): Promise<{ error?: string }> {
  const auth = await requireAccount();
  if ("error" in auth) return auth;

  const owned = await prisma.sale.findFirst({
    where: { id, channel: { accountId: auth.account.id } },
    select: { id: true },
  });
  if (!owned) return { error: "No encontrado." };

  try {
    await prisma.sale.delete({ where: { id } });
    updateTag(`txn-${auth.account.id}`);
    return {};
  } catch {
    return { error: "Error al eliminar la venta." };
  }
}
