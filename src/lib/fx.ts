const API_BASE = "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies";

/**
 * Fetches the current exchange rate from `fromCurrency` to CLP.
 * Uses the free jsDelivr-hosted currency API — no key required.
 * Returns null if the currency is unknown or the request fails.
 */
export async function fetchRateToCLP(fromCurrency: string): Promise<number | null> {
  const key = fromCurrency.toLowerCase();
  if (key === "clp") return 1;
  try {
    const res = await fetch(`${API_BASE}/${key}.json`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return (data[key]?.clp as number) ?? null;
  } catch {
    return null;
  }
}
