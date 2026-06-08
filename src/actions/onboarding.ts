"use server";

import { prisma } from "@/lib/prisma";
import { updateTag } from "next/cache";
import { requireAccount } from "@/lib/auth";
import { BookFormat, ChannelType } from "@/generated/prisma/client";

type PresetChannel = {
  name:                string;
  type:                ChannelType;
  currency?:           string;
  royaltyPercent?:     number;
  consignmentPercent?: number;
};

type PrintRunData = {
  quantity:  number;
  totalCost: number;
  supplier?: string;
};

export async function completeOnboarding({
  book,
  channels,
  printRun,
  accountId: _ignored,
}: {
  book?:      { title: string; formats: BookFormat[] };
  channels?:  PresetChannel[];
  printRun?:  PrintRunData;
  accountId?: string; // derived from session; caller value is ignored
}): Promise<{ error?: string }> {
  const auth = await requireAccount();
  if ("error" in auth) return auth;

  const accountId = auth.account.id;

  try {
    await prisma.$transaction(async (tx) => {
      let bookId: string | undefined;

      if (book?.title.trim()) {
        const created = await tx.book.create({
          data: {
            accountId,
            title:   book.title.trim(),
            formats: book.formats,
          },
        });
        bookId = created.id;
      }

      if (channels?.length) {
        for (const ch of channels) {
          await tx.channel.create({
            data: {
              accountId,
              name:               ch.name,
              type:               ch.type,
              currency:           ch.currency           ?? null,
              royaltyPercent:     ch.royaltyPercent     ?? null,
              consignmentPercent: ch.consignmentPercent ?? null,
            },
          });
        }
      }

      if (bookId && printRun && printRun.quantity > 0) {
        const costPerUnit = printRun.totalCost / printRun.quantity;
        const run = await tx.printRun.create({
          data: {
            bookId,
            quantity:    printRun.quantity,
            totalCost:   printRun.totalCost.toFixed(2),
            costPerUnit: costPerUnit.toFixed(4),
            supplier:    printRun.supplier?.trim() || null,
            receivedAt:  new Date(),
          },
        });
        await tx.inventoryMovement.create({
          data: {
            bookId,
            printRunId: run.id,
            type:       "NEW_PRINT_RUN",
            quantity:   printRun.quantity,
            occurredAt: new Date(),
          },
        });
      }

      await tx.account.update({
        where: { id: accountId },
        data:  { onboardingCompletedAt: new Date() },
      });
    });
    updateTag(`config-${auth.account.id}`);
    updateTag(`txn-${auth.account.id}`);
    return {};
  } catch {
    return { error: "Error al completar la configuración. Inténtalo de nuevo." };
  }
}
