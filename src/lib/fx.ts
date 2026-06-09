const apiBase = (version: string) =>
  `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${version}/v1/currencies`;

async function fetchRate(key: string, version: string): Promise<number | null> {
  try {
    const res = await fetch(`${apiBase(version)}/${key}.json`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return (data[key]?.clp as number) ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetches the exchange rate from `fromCurrency` to CLP.
 * Uses the free jsDelivr-hosted currency API — no key required.
 *
 * Pass `date` (YYYY-MM-DD) for the historical rate on that day — used when
 * registering past sales. Falls back to the latest rate if the dated
 * snapshot is unavailable (e.g. today's rate not yet published).
 * Returns null if the currency is unknown or all requests fail.
 */
export async function fetchRateToCLP(fromCurrency: string, date?: string): Promise<number | null> {
  const key = fromCurrency.toLowerCase();
  if (key === "clp") return 1;

  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const dated = await fetchRate(key, date);
    if (dated != null) return dated;
  }

  return fetchRate(key, "latest");
}
