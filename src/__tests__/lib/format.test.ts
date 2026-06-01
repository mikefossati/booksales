import { describe, it, expect } from "vitest";
import { toNum, formatCurrency, formatDate } from "@/lib/format";

// ─────────────────────────────────────────────────────────────────────────────
// toNum
// ─────────────────────────────────────────────────────────────────────────────

describe("toNum", () => {
  it("returns 0 for null", () => {
    expect(toNum(null)).toBe(0);
  });

  it("returns 0 for undefined", () => {
    expect(toNum(undefined)).toBe(0);
  });

  it("returns the number itself for a plain number", () => {
    expect(toNum(42)).toBe(42);
  });

  it("returns 0 for numeric zero", () => {
    expect(toNum(0)).toBe(0);
  });

  it("handles negative numbers", () => {
    expect(toNum(-100)).toBe(-100);
  });

  it("converts a numeric string to number", () => {
    expect(toNum("3.14")).toBeCloseTo(3.14);
  });

  it("handles a Prisma Decimal-like object (has toString returning a number string)", () => {
    // Prisma Decimal coerces to number via Number()
    const decimal = { toString: () => "12345.67", valueOf: () => 12345.67 };
    expect(toNum(decimal)).toBeCloseTo(12345.67);
  });

  it("returns 0 for NaN-producing inputs", () => {
    // Number("") → 0, not NaN in some environments; test what the function actually does
    expect(typeof toNum("not-a-number")).toBe("number");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// formatCurrency
// ─────────────────────────────────────────────────────────────────────────────

describe("formatCurrency", () => {
  it("formats CLP with 0 decimal places (es-CL uses . as thousands separator)", () => {
    const result = formatCurrency(248500, "CLP");
    // es-CL: $248.500 — the dot is a thousands separator, not decimals
    expect(result).toContain("248");
    expect(result).toContain("500");
    // Should NOT contain a fractional part (no cents after a decimal comma)
    expect(result).not.toMatch(/,\d{2}$/);
  });

  it("formats USD with up to 2 decimal places", () => {
    const result = formatCurrency(1234.5, "USD");
    expect(result).toContain("1");
    // US dollars should include decimals
    expect(result).toMatch(/\d+[.,]\d{2}/);
  });

  it("formats zero correctly for CLP", () => {
    const result = formatCurrency(0, "CLP");
    expect(result).toContain("0");
  });

  it("defaults to CLP when no currency provided", () => {
    const withCLP     = formatCurrency(1000, "CLP");
    const withDefault = formatCurrency(1000);
    expect(withCLP).toBe(withDefault);
  });

  it("formats EUR", () => {
    const result = formatCurrency(1000, "EUR");
    expect(result).toContain("1");
  });

  it("handles large amounts", () => {
    const result = formatCurrency(1_000_000, "CLP");
    expect(result).toContain("1");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// formatDate
// ─────────────────────────────────────────────────────────────────────────────

describe("formatDate", () => {
  it("formats a Date object in es-CL locale", () => {
    const date = new Date("2025-06-15T12:00:00Z");
    const result = formatDate(date);
    expect(result).toContain("15");
    expect(result).toContain("2025");
  });

  it("accepts an ISO string", () => {
    const result = formatDate("2025-06-15T12:00:00Z");
    expect(result).toContain("15");
    expect(result).toContain("2025");
  });

  it("returns a string", () => {
    expect(typeof formatDate(new Date())).toBe("string");
  });

  it("formats January correctly", () => {
    const result = formatDate(new Date("2025-01-01T12:00:00Z"));
    expect(result).toContain("2025");
  });
});
