"use server";

import { prisma } from "@/lib/prisma";
import { ExpenseCategory, ExpenseLevel } from "@/generated/prisma/client";
import { resolveExpenseAssignments } from "@/lib/finance";

export async function createExpense({
  accountId,
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
  accountId: string;
  description: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  level: ExpenseLevel;
  bookId?: string;
  printRunId?: string;
  occurredAt: string; // YYYY-MM-DD
  notes?: string;
}): Promise<{ error?: string }> {
  if (!description.trim()) return { error: "La descripción es obligatoria." };
  if (amount <= 0)          return { error: "El monto debe ser mayor a 0." };

  try {
    await prisma.expense.create({
      data: {
        accountId,
        description: description.trim(),
        amount:      amount.toFixed(2),
        currency,
        category,
        level,
        ...resolveExpenseAssignments(level, bookId, printRunId),
        occurredAt:  new Date(occurredAt + "T12:00:00"),
        notes:       notes?.trim() || null,
      },
    });
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
  if (!description.trim()) return { error: "La descripción es obligatoria." };
  if (amount <= 0)          return { error: "El monto debe ser mayor a 0." };

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
        occurredAt:  new Date(occurredAt + "T12:00:00"),
        notes:       notes?.trim() || null,
      },
    });
    return {};
  } catch {
    return { error: "Error al actualizar el gasto. Inténtalo de nuevo." };
  }
}

export async function deleteExpense(id: string): Promise<{ error?: string }> {
  try {
    await prisma.expense.delete({ where: { id } });
    return {};
  } catch {
    return { error: "Error al eliminar el gasto." };
  }
}
