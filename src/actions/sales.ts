"use server";

import { prisma } from "@/lib/prisma";
import { SaleStatus } from "@/generated/prisma/client";
import { calcSaleTotal, shouldTrackBookInventory } from "@/lib/finance";

export async function createSale({
  bookId,
  channelId,
  quantity,
  unitPrice,
  currency,
  fxRateToCLP,
  paymentMethod,
}: {
  bookId: string;
  channelId: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  fxRateToCLP?: number;
  paymentMethod?: string;
}): Promise<{ error?: string }> {
  if (quantity < 1)  return { error: "La cantidad debe ser al menos 1." };
  if (unitPrice < 0) return { error: "El precio no puede ser negativo." };

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
          unitPrice:    unitPrice.toFixed(2),
          totalAmount:  total.toFixed(2),
          currency,
          fxRateToCLP:  fxRateToCLP != null ? fxRateToCLP.toFixed(6) : null,
          amountCLP:    amountCLP != null ? amountCLP.toFixed(2) : null,
          paymentMethod: paymentMethod ?? null,
          status: "CONFIRMED",
          origin: "manual",
        },
      });

      if (trackInventory) {
        await tx.inventoryMovement.create({
          data: {
            bookId,
            type:      "DIRECT_SALE",
            quantity,
            channelId,
            occurredAt: new Date(),
          },
        });
      }
    });
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
  if (quantity < 1)  return { error: "La cantidad debe ser al menos 1." };
  if (unitPrice < 0) return { error: "El precio no puede ser negativo." };

  try {
    const existing  = await prisma.sale.findUnique({ where: { id }, select: { currency: true } });
    const currency  = existing?.currency ?? "CLP";
    const total     = calcSaleTotal(quantity, unitPrice);
    const rate      = fxRateToCLP !== undefined ? fxRateToCLP : null;
    const amountCLP = rate != null ? total * rate : currency === "CLP" ? total : null;

    await prisma.sale.update({
      where: { id },
      data: {
        quantity,
        unitPrice:    unitPrice.toFixed(2),
        totalAmount:  total.toFixed(2),
        channelId,
        saleDate:     new Date(saleDate + "T12:00:00"),
        fxRateToCLP:  rate != null ? rate.toFixed(6) : null,
        amountCLP:    amountCLP != null ? amountCLP.toFixed(2) : null,
        paymentMethod: paymentMethod || null,
        status,
        notes:        notes?.trim() || null,
        currency,
      },
    });
    return {};
  } catch {
    return { error: "Error al actualizar la venta." };
  }
}

export async function deleteSale(id: string): Promise<{ error?: string }> {
  try {
    await prisma.sale.delete({ where: { id } });
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
