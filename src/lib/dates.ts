/**
 * Resolves a user-supplied sale date (YYYY-MM-DD) to a Date, or rejects it.
 * - Omitted → now (preserves previous behavior)
 * - Parsed at noon local time to avoid UTC day-shift
 * - Future dates rejected, with one day of slack so users in timezones
 *   ahead of the server aren't rejected on their own "today"
 */
export function resolveSaleDate(
  input?: string,
): { date: Date; error?: never } | { error: string; date?: never } {
  if (!input) return { date: new Date() };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return { error: "Fecha inválida." };

  const date = new Date(input + "T12:00:00");
  if (isNaN(date.getTime())) return { error: "Fecha inválida." };

  const limit = new Date();
  limit.setDate(limit.getDate() + 1);
  limit.setHours(23, 59, 59, 999);
  if (date > limit) return { error: "La fecha no puede ser futura." };

  return { date };
}

/** Today as YYYY-MM-DD in the user's local timezone (for date inputs). */
export function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
