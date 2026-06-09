import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchRateToCLP } from "@/lib/fx";

describe("fetchRateToCLP", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ── CLP shortcut (no network call) ─────────────────────────────────────────

  it("returns 1 for CLP without calling fetch", async () => {
    const spy = vi.spyOn(global, "fetch");
    const rate = await fetchRateToCLP("CLP");
    expect(rate).toBe(1);
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns 1 for lowercase 'clp' without calling fetch", async () => {
    const spy = vi.spyOn(global, "fetch");
    const rate = await fetchRateToCLP("clp");
    expect(rate).toBe(1);
    expect(spy).not.toHaveBeenCalled();
  });

  // ── Successful fetch ────────────────────────────────────────────────────────

  it("returns the clp rate for USD", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ usd: { clp: 970 } }),
    } as Response);

    expect(await fetchRateToCLP("USD")).toBe(970);
  });

  it("returns the clp rate for ARS", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ars: { clp: 1.12 } }),
    } as Response);

    expect(await fetchRateToCLP("ARS")).toBe(1.12);
  });

  it("uses lowercase currency key in the fetch URL", async () => {
    const spy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ usd: { clp: 970 } }),
    } as Response);

    await fetchRateToCLP("USD");
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("/usd.json"),
      expect.any(Object),
    );
  });

  // ── Failure paths ───────────────────────────────────────────────────────────

  it("returns null when response is not ok (4xx/5xx)", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    } as Response);

    expect(await fetchRateToCLP("USD")).toBeNull();
  });

  it("returns null when fetch throws a network error", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("network error"));
    expect(await fetchRateToCLP("USD")).toBeNull();
  });

  it("returns null when the clp key is missing from the currency object", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ usd: { eur: 0.92 } }), // no clp key
    } as Response);

    expect(await fetchRateToCLP("USD")).toBeNull();
  });

  it("returns null when the currency key itself is missing from the response", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    } as Response);

    expect(await fetchRateToCLP("USD")).toBeNull();
  });

  it("returns null for an unknown/unsupported currency when fetch fails", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    } as Response);

    expect(await fetchRateToCLP("XYZ")).toBeNull();
  });

  // ── Historical rates ────────────────────────────────────────────────────────

  it("uses the dated endpoint when a date is provided", async () => {
    const spy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ usd: { clp: 940 } }),
    } as Response);

    expect(await fetchRateToCLP("USD", "2026-05-01")).toBe(940);
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("@2026-05-01"),
      expect.any(Object),
    );
  });

  it("falls back to latest when the dated snapshot is unavailable", async () => {
    const spy = vi.spyOn(global, "fetch")
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ usd: { clp: 970 } }) } as Response);

    expect(await fetchRateToCLP("USD", "2026-06-09")).toBe(970);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenLastCalledWith(
      expect.stringContaining("@latest"),
      expect.any(Object),
    );
  });

  it("ignores malformed dates and goes straight to latest", async () => {
    const spy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ usd: { clp: 970 } }),
    } as Response);

    expect(await fetchRateToCLP("USD", "garbage")).toBe(970);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("@latest"),
      expect.any(Object),
    );
  });
});
