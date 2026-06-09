"use server";

import { prisma } from "@/lib/prisma";
import { updateTag } from "next/cache";
import { requireAccount } from "@/lib/auth";
import { SaleStatus } from "@/generated/prisma/client";
import { resolvePricing, shouldTrackBookInventory } from "@/lib/finance";
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

  const amountCLP = fxRateToCLP != null ? pricing.total * fxRateToCLP : currency === "CLP" ? pricing.total : null;
  const trackInventory = await shouldTrackInventory(bookId, channelId);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.sale.create({
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
    where: { id, channel: { accountId: auth.account.id } },
    select: { id: true, currency: true },
  });
  if (!owned) return { error: "No encontrado." };

  const currency  = owned.currency;
  const rate      = fxRateToCLP !== undefined ? fxRateToCLP : null;
  const amountCLP = rate != null ? pricing.total * rate : currency === "CLP" ? pricing.total : null;

  try {
    await prisma.sale.update({
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
