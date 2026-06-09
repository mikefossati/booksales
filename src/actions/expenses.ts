"use server";

import { prisma } from "@/lib/prisma";
import { updateTag } from "next/cache";
import { requireAccount } from "@/lib/auth";
import { ExpenseCategory, ExpenseLevel } from "@/generated/prisma/client";
import { resolveExpenseAssignments } from "@/lib/finance";
import { resolveSaleDate } from "@/lib/dates";

export async function createExpense({
  description,
  amount,
  currency,
  category,
  level,
  bookId,
  printRunId,
  occurredAt,
  notes,
  accountId: _ignored,
}: {
  description: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  level: ExpenseLevel;
  bookId?: string;
  printRunId?: string;
  occurredAt: string; // YYYY-MM-DD
  notes?: string;
  accountId?: string; // derived from session; caller value is ignored
}): Promise<{ error?: string }> {
  const auth = await requireAccount();
  if ("error" in auth) return auth;

  if (!description.trim()) return { error: "La descripción es obligatoria." };
  if (amount <= 0)          return { error: "El monto debe ser mayor a 0." };

  const resolvedDate = resolveSaleDate(occurredAt);
  if (resolvedDate.error) return { error: resolvedDate.error };

  try {
    await prisma.expense.create({
      data: {
        accountId:   auth.account.id,
        description: description.trim(),
        amount:      amount.toFixed(2),
        currency,
        category,
        level,
        ...resolveExpenseAssignments(level, bookId, printRunId),
        occurredAt:  resolvedDate.date,
        notes:       notes?.trim() || null,
      },
    });
    updateTag(`txn-${auth.account.id}`);
    return {};
  } catch {
    return { error: "Error al guardar el gasto. Inténtalo de nuevo." };
  }
}

export async function updateExpense({
  id,
  description,
  amount,
  currency,
  category,
  level,
  bookId,
  printRunId,
  occurredAt,
  notes,
}: {
  id: string;
  description: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  level: ExpenseLevel;
  bookId?: string;
  printRunId?: string;
  occurredAt: string;
  notes?: string;
}): Promise<{ error?: string }> {
  const auth = await requireAccount();
  if ("error" in auth) return auth;

  if (!description.trim()) return { error: "La descripción es obligatoria." };
  if (amount <= 0)          return { error: "El monto debe ser mayor a 0." };

  const owned = await prisma.expense.findFirst({
    where: { id, accountId: auth.account.id },
    select: { id: true },
  });
  if (!owned) return { error: "No encontrado." };

  const resolvedDate = resolveSaleDate(occurredAt);
  if (resolvedDate.error) return { error: resolvedDate.error };

  try {
    await prisma.expense.update({
      where: { id },
      data: {
        description: description.trim(),
        amount:      amount.toFixed(2),
        currency,
        category,
        level,
        ...resolveExpenseAssignments(level, bookId, printRunId),
        occurredAt:  resolvedDate.date,
        notes:       notes?.trim() || null,
      },
    });
    updateTag(`txn-${auth.account.id}`);
    return {};
  } catch {
    return { error: "Error al actualizar el gasto. Inténtalo de nuevo." };
  }
}

export async function deleteExpense(id: string): Promise<{ error?: string }> {
  const auth = await requireAccount();
  if ("error" in auth) return auth;

  const owned = await prisma.expense.findFirst({
    where: { id, accountId: auth.account.id },
    select: { id: true },
  });
  if (!owned) return { error: "No encontrado." };

  try {
    await prisma.expense.delete({ where: { id } });
    updateTag(`txn-${auth.account.id}`);
    return {};
  } catch {
    return { error: "Error al eliminar el gasto." };
  }
}
