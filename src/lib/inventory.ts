import { prisma } from "@/lib/prisma";

/**
 * Returns the account's default inventory ("Inventario personal"),
 * creating it if missing (accounts created before the inventory module).
 */
export async function getOrCreateDefaultInventory(accountId: string): Promise<{ id: string }> {
  const existing = await prisma.inventory.findFirst({
    where:  { accountId, isDefault: true },
    select: { id: true },
  });
  if (existing) return existing;

  return prisma.inventory.create({
    data:   { accountId, name: "Inventario personal", isDefault: true },
    select: { id: true },
  });
}
