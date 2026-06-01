"use server";

import { prisma } from "@/lib/prisma";
import { BookFormat } from "@/generated/prisma/client";

export async function createBook({
  accountId,
  title,
  formats,
}: {
  accountId: string;
  title: string;
  formats: BookFormat[];
}): Promise<{ error?: string }> {
  if (!title.trim()) return { error: "El título es obligatorio." };
  if (formats.length === 0) return { error: "Selecciona al menos un formato." };

  try {
    await prisma.book.create({
      data: { accountId, title: title.trim(), formats },
    });
    return {};
  } catch {
    return { error: "Error al guardar el libro. Inténtalo de nuevo." };
  }
}

export async function updateBook({
  id,
  title,
  subtitle,
  formats,
  isbn,
  language,
  publishedAt,
  coverUrl,
  description,
}: {
  id: string;
  title: string;
  subtitle?: string;
  formats: BookFormat[];
  isbn?: string;
  language?: string;
  publishedAt?: string;
  coverUrl?: string;
  description?: string;
}): Promise<{ error?: string }> {
  if (!title.trim())    return { error: "El título es obligatorio." };
  if (!formats.length)  return { error: "Selecciona al menos un formato." };

  try {
    await prisma.book.update({
      where: { id },
      data: {
        title:       title.trim(),
        subtitle:    subtitle?.trim()    || null,
        formats,
        isbn:        isbn?.trim()        || null,
        language:    language?.trim()    || null,
        publishedAt: publishedAt         ? new Date(publishedAt + "T12:00:00") : null,
        coverUrl:    coverUrl?.trim()    || null,
        description: description?.trim() || null,
      },
    });
    return {};
  } catch {
    return { error: "Error al guardar los cambios." };
  }
}

export async function deleteBook(id: string): Promise<{ error?: string }> {
  const [salesCount, printRunCount] = await Promise.all([
    prisma.sale.count({ where: { bookId: id } }),
    prisma.printRun.count({ where: { bookId: id } }),
  ]);

  if (salesCount > 0 || printRunCount > 0) {
    const parts: string[] = [];
    if (salesCount > 0)   parts.push(`${salesCount} venta${salesCount > 1 ? "s" : ""}`);
    if (printRunCount > 0) parts.push(`${printRunCount} tirada${printRunCount > 1 ? "s" : ""}`);
    return { error: `No se puede eliminar: este libro tiene ${parts.join(" y ")} registradas.` };
  }

  try {
    await prisma.book.delete({ where: { id } });
    return {};
  } catch {
    return { error: "Error al eliminar el libro." };
  }
}
