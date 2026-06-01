"use server";

import { prisma } from "@/lib/prisma";
import { BookFormat, ChannelType } from "@/generated/prisma/client";

type PresetChannel = {
  name: string;
  type: ChannelType;
};

type PrintRunData = {
  quantity: number;
  totalCost: number;
  supplier?: string;
};

export async function completeOnboarding({
  accountId,
  book,
  channels,
  printRun,
}: {
  accountId: string;
  book?: { title: string; formats: BookFormat[] };
  channels?: PresetChannel[];
  printRun?: PrintRunData;
}): Promise<{ error?: string }> {
  try {
    await prisma.$transaction(async (tx) => {
      let bookId: string | undefined;

      if (book?.title.trim()) {
        const created = await tx.book.create({
          data: {
            accountId,
            title: book.title.trim(),
            formats: book.formats,
          },
        });
        bookId = created.id;
      }

      if (channels?.length) {
        for (const ch of channels) {
          await tx.channel.create({
            data: { accountId, name: ch.name, type: ch.type },
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
        data: { onboardingCompletedAt: new Date() },
      });
    });
    return {};
  } catch {
    return { error: "Error al completar la configuración. Inténtalo de nuevo." };
  }
}
