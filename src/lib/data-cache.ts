import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

// ── Cache tag helpers ──────────────────────────────────────────────────────────
// config-{id}: invalidated when books / channels / merch definitions change
// txn-{id}:    invalidated when sales / expenses / payments / inventory change
// Both layout and reportes caches carry both tags, so any mutation clears them.

export const configTag = (accountId: string) => `config-${accountId}`;
export const txnTag    = (accountId: string) => `txn-${accountId}`;

// ── Layout data ────────────────────────────────────────────────────────────────
// 5 queries on every page navigation → cached until any mutation fires.

export function getCachedLayoutData(accountId: string) {
  return unstable_cache(
    async () => {
      const [books, merch, channels, lastBookSales, lastMerchSales] = await Promise.all([
        prisma.book.findMany({
          where:   { accountId },
          select:  { id: true, title: true, coverUrl: true },
          orderBy: { createdAt: "desc" },
        }),
        prisma.merchandise.findMany({
          where:   { accountId, isActive: true },
          select:  { id: true, name: true },
          orderBy: { name: "asc" },
        }),
        prisma.channel.findMany({
          where:   { accountId },
          select:  { id: true, name: true, type: true, currency: true },
          orderBy: { createdAt: "asc" },
        }),
        // isBulk excluded: bulk-sale unit prices are derived averages,
        // not real prices worth suggesting
        prisma.sale.findMany({
          where:   { channel: { accountId }, bookId: { not: null }, status: { not: "CANCELLED" }, isBulk: false },
          select:  { bookId: true, channelId: true, unitPrice: true },
          orderBy: { saleDate: "desc" },
        }),
        prisma.sale.findMany({
          where:   { channel: { accountId }, merchandiseId: { not: null }, status: { not: "CANCELLED" }, isBulk: false },
          select:  { merchandiseId: true, channelId: true, unitPrice: true },
          orderBy: { saleDate: "desc" },
        }),
      ]);
      return { books, merch, channels, lastBookSales, lastMerchSales };
    },
    [`layout-${accountId}`],
    { tags: [configTag(accountId), txnTag(accountId)] },
  )();
}

// ── Reportes / Export data ─────────────────────────────────────────────────────
// 8 queries shared between reportes/page.tsx and api/export/route.ts.
// Both pages apply period filtering in-memory from this full-history dataset.

export function getCachedReportesData(accountId: string) {
  return unstable_cache(
    async () => {
      const channels = await prisma.channel.findMany({
        where:   { accountId },
        select: {
          id: true, name: true, type: true, currency: true,
          inventoryId: true,
        },
        orderBy: { name: "asc" },
      });
      const channelIds = channels.map(c => c.id);
      const base = {
        channelId: { in: channelIds.length ? channelIds : ["__none__"] },
        status:    { not: "CANCELLED" as const },
      };

      const [allSales, allExpenses, allPayments, books, printRuns, bookMovements, allExchanges, merchandise, inventories] =
        await Promise.all([
          prisma.sale.findMany({
            where:   base,
            include: {
              channel:     { select: { name: true, type: true } },
              merchandise: { select: { name: true } },
            },
            orderBy: { saleDate: "desc" },
          }),
          prisma.expense.findMany({
            where:   { accountId },
            include: { book: { select: { title: true } } },
            orderBy: { occurredAt: "desc" },
          }),
          prisma.payment.findMany({
            where:  { channelId: { in: channelIds.length ? channelIds : ["__none__"] } },
            select: { channelId: true, amount: true },
          }),
          prisma.book.findMany({
            where:   { accountId },
            select:  { id: true, title: true, formats: true, coverUrl: true },
            orderBy: { title: "asc" },
          }),
          prisma.printRun.findMany({
            where:   { book: { accountId } },
            select:  { id: true, bookId: true, quantity: true, totalCost: true, receivedAt: true, createdAt: true },
            orderBy: { receivedAt: "desc" },
          }),
          prisma.inventoryMovement.findMany({
            where:  { bookId: { not: null }, book: { accountId } },
            select: { bookId: true, channelId: true, type: true, quantity: true, inventoryId: true, occurredAt: true },
          }),
          prisma.exchange.findMany({
            where:   { book: { accountId } },
            include: { book: { select: { title: true } } },
            orderBy: { sentAt: "desc" },
          }),
          // Superset of fields needed by both reportes page and export route.
          prisma.merchandise.findMany({
            where:   { accountId },
            include: {
              productionBatches: { select: { quantity: true, totalCost: true } },
              sales: {
                where:  { status: { not: "CANCELLED" } },
                select: { quantity: true, totalAmount: true, amountCLP: true, currency: true },
              },
            },
            orderBy: { name: "asc" },
          }),
          prisma.inventory.findMany({
            where:   { accountId },
            select:  { id: true, name: true, isDefault: true, channels: { select: { id: true, type: true } } },
            orderBy: [{ isDefault: "desc" }, { name: "asc" }],
          }),
        ]);

      return {
        channels, channelIds,
        allSales, allExpenses, allPayments,
        books, printRuns, bookMovements, allExchanges, merchandise,
        inventories,
      };
    },
    [`reportes-${accountId}`],
    { tags: [configTag(accountId), txnTag(accountId)] },
  )();
}
