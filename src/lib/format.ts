export function formatCurrency(
  amount: number,
  currency = "CLP"
): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "CLP" ? 0 : 2,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function toNum(decimal: unknown): number {
  if (decimal === null || decimal === undefined) return 0;
  return Number(decimal);
}
