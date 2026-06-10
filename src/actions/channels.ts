"use server";

import { prisma } from "@/lib/prisma";
import { updateTag } from "next/cache";
import { requireAccount } from "@/lib/auth";
import { ChannelType } from "@/generated/prisma/client";
import { getOrCreateDefaultInventory } from "@/lib/inventory";

/**
 * inventoryId semantics for create/update:
 * - "none"          → channel has no physical stock (e.g. print-on-demand)
 * - "own"           → create a new inventory named after the channel
 * - "default"       → the account's personal inventory
 * - any other value → an existing inventory id (ownership verified)
 * - undefined (create) → sensible default per channel type
 * - undefined (update) → leave unchanged
 */
async function resolveInventoryId(
  accountId: string,
  choice: string | undefined,
  channelName: string,
  channelType: ChannelType,
): Promise<{ id: string | null } | { error: string }> {
  if (choice === "none") return { id: null };

  if (choice === "own") {
    const created = await prisma.inventory.create({
      data:   { accountId, name: channelName.trim() },
      select: { id: true },
    });
    return { id: created.id };
  }

  if (choice === "default" || (choice === undefined && channelType === "DIRECT")) {
    return { id: (await getOrCreateDefaultInventory(accountId)).id };
  }

  if (choice === undefined) {
    // BOOKSTORE gets its own inventory by default; DIGITAL gets none
    if (channelType === "BOOKSTORE") {
      const created = await prisma.inventory.create({
        data:   { accountId, name: channelName.trim() },
        select: { id: true },
      });
      return { id: created.id };
    }
    return { id: null };
  }

  const existing = await prisma.inventory.findFirst({
    where:  { id: choice, accountId },
    select: { id: true },
  });
  if (!existing) return { error: "Inventario no encontrado." };
  return { id: existing.id };
}

export async function createChannel({
  name,
  type,
  currency,
  city,
  inventoryId,
  accountId: _ignored,
}: {
  name: string;
  type: ChannelType;
  currency?: string | null;
  city?: string | null;
  inventoryId?: string; // "none" | "own" | "default" | existing id; omitted → per-type default
  accountId?: string; // derived from session; caller value is ignored
}): Promise<{ error?: string }> {
  const auth = await requireAccount();
  if ("error" in auth) return auth;

  if (!name.trim()) return { error: "El nombre es obligatorio." };

  const inventory = await resolveInventoryId(auth.account.id, inventoryId, name, type);
  if ("error" in inventory) return inventory;

  try {
    await prisma.channel.create({
      data: {
        accountId:   auth.account.id,
        name:        name.trim(),
        type,
        currency:    currency?.trim() || null,
        city:        city?.trim()     || null,
        inventoryId: inventory.id,
      },
    });
    updateTag(`config-${auth.account.id}`);
    return {};
  } catch {
    return { error: "Error al guardar el canal. Inténtalo de nuevo." };
  }
}

export async function updateChannel({
  id,
  name,
  currency,
  city,
  inventoryId,
}: {
  id: string;
  name: string;
  currency?: string | null;
  city?: string | null;
  inventoryId?: string; // "none" | "own" | "default" | existing id; omitted → unchanged
}): Promise<{ error?: string }> {
  const auth = await requireAccount();
  if ("error" in auth) return auth;

  if (!name.trim()) return { error: "El nombre es obligatorio." };

  const owned = await prisma.channel.findFirst({
    where: { id, accountId: auth.account.id },
    select: { id: true, type: true },
  });
  if (!owned) return { error: "No encontrado." };

  let inventoryUpdate: { inventoryId: string | null } | Record<string, never> = {};
  if (inventoryId !== undefined) {
    const inventory = await resolveInventoryId(auth.account.id, inventoryId, name, owned.type);
    if ("error" in inventory) return inventory;
    inventoryUpdate = { inventoryId: inventory.id };
  }

  try {
    await prisma.channel.update({
      where: { id },
      data: {
        name:     name.trim(),
        currency: currency?.trim() || null,
        city:     city?.trim()     || null,
        ...inventoryUpdate,
      },
    });
    updateTag(`config-${auth.account.id}`);
    return {};
  } catch {
    return { error: "Error al guardar los cambios." };
  }
}

export async function deleteChannel(id: string): Promise<{ error?: string }> {
  const auth = await requireAccount();
  if ("error" in auth) return auth;

  const owned = await prisma.channel.findFirst({
    where: { id, accountId: auth.account.id },
    select: { id: true },
  });
  if (!owned) return { error: "No encontrado." };

  const [salesCount, paymentsCount] = await Promise.all([
    prisma.sale.count({ where: { channelId: id } }),
    prisma.payment.count({ where: { channelId: id } }),
  ]);

  if (salesCount > 0) {
    return {
      error: `Este canal tiene ${salesCount} venta${salesCount !== 1 ? "s" : ""} registrada${salesCount !== 1 ? "s" : ""}. Elimina esas ventas primero.`,
    };
  }
  if (paymentsCount > 0) {
    return {
      error: `Este canal tiene ${paymentsCount} cobro${paymentsCount !== 1 ? "s" : ""} registrado${paymentsCount !== 1 ? "s" : ""}. Elimínalos primero.`,
    };
  }

  try {
    await prisma.channel.delete({ where: { id } });
    updateTag(`config-${auth.account.id}`);
    return {};
  } catch {
    return { error: "Error al eliminar el canal. Inténtalo de nuevo." };
  }
}
