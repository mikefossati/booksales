"use server";

import { prisma } from "@/lib/prisma";
import { updateTag } from "next/cache";
import { requireAccount } from "@/lib/auth";
import { SaleStatus } from "@/generated/prisma/client";
import { calcSaleTotal, shouldTrackBookInventory } from "@/lib/finance";
import { resolveSaleDate } from "@/lib/dates";

export async function createSale({
  bookId,
  channelId,
  quantity,
  unitPrice,
  currency,
  fxRateToCLP,
  paymentMethod,
  saleDate,
}: {
  bookId: string;
  channelId: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  fxRateToCLP?: number;
  paymentMethod?: string;
  saleDate?: string; // YYYY-MM-DD; omitted → today
}): Promise<{ error?: string }> {
  const auth = await requireAccount();
  if ("error" in auth) return auth;

  if (quantity < 1)  return { error: "La cantidad debe ser al menos 1." };
  if (unitPrice < 0) return { error: "El precio no puede ser negativo." };

  const resolvedDate = resolveSaleDate(saleDate);
  if (resolvedDate.error) return { error: resolvedDate.error };

  const channelOwned = await prisma.channel.findFirst({
    where: { id: channelId, accountId: auth.account.id },
    select: { id: true },
  });
  if (!channelOwned) return { error: "No encontrado." };

  if (bookId) {
    const bookOwned = await prisma.book.findFirst({
      where: { id: bookId, accountId: auth.account.id },
      select: { id: true },
    });
    if (!bookOwned) return { error: "No encontrado." };
  }

  const total     = calcSaleTotal(quantity, unitPrice);
  const amountCLP = fxRateToCLP != null ? total * fxRateToCLP : currency === "CLP" ? total : null;
  const trackInventory = await shouldTrackInventory(bookId, channelId);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.sale.create({
        data: {
          bookId,
          channelId,
          quantity,
          unitPrice:     unitPrice.toFixed(2),
          totalAmount:   total.toFixed(2),
          currency,
          fxRateToCLP:   fxRateToCLP != null ? fxRateToCLP.toFixed(6) : null,
          amountCLP:     amountCLP != null ? amountCLP.toFixed(2) : null,
          paymentMethod: paymentMethod ?? null,
          status:        "CONFIRMED",
          origin:        "manual",
          saleDate:      resolvedDate.date,
        },
      });

      if (trackInventory) {
        await tx.inventoryMovement.create({
          data: {
            bookId,
            type:       "DIRECT_SALE",
            quantity,
            channelId,
            occurredAt: resolvedDate.date,
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
  channelId,
  saleDate,
  fxRateToCLP,
  paymentMethod,
  status,
  notes,
}: {
  id: string;
  quantity: number;
  unitPrice: number;
  channelId: string;
  saleDate: string;
  fxRateToCLP?: number | null;
  paymentMethod?: string;
  status: SaleStatus;
  notes?: string;
}): Promise<{ error?: string }> {
  const auth = await requireAccount();
  if ("error" in auth) return auth;

  if (quantity < 1)  return { error: "La cantidad debe ser al menos 1." };
  if (unitPrice < 0) return { error: "El precio no puede ser negativo." };

  const owned = await prisma.sale.findFirst({
    where: { id, channel: { accountId: auth.account.id } },
    select: { id: true, currency: true },
  });
  if (!owned) return { error: "No encontrado." };

  const currency  = owned.currency;
  const total     = calcSaleTotal(quantity, unitPrice);
  const rate      = fxRateToCLP !== undefined ? fxRateToCLP : null;
  const amountCLP = rate != null ? total * rate : currency === "CLP" ? total : null;

  try {
    await prisma.sale.update({
      where: { id },
      data: {
        quantity,
        unitPrice:     unitPrice.toFixed(2),
        totalAmount:   total.toFixed(2),
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

// ── Internal helpers ──────────────────────────────────────────────────────────

async function shouldTrackInventory(bookId: string, channelId: string): Promise<boolean> {
  const [channel, book] = await Promise.all([
    prisma.channel.findUnique({ where: { id: channelId }, select: { type: true } }),
    prisma.book.findUnique({ where: { id: bookId }, select: { formats: true } }),
  ]);
  return shouldTrackBookInventory(channel?.type ?? "", book?.formats ?? []);
}
