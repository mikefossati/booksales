import { describe, it, expect } from "vitest";
import { resolveSaleDate, todayLocal } from "@/lib/dates";

describe("resolveSaleDate", () => {
  it("defaults to now when omitted", () => {
    const result = resolveSaleDate();
    expect(result.error).toBeUndefined();
    expect(Math.abs(result.date!.getTime() - Date.now())).toBeLessThan(5000);
  });

  it("accepts a valid past date and parses it at noon local", () => {
    const result = resolveSaleDate("2026-01-15");
    expect(result.error).toBeUndefined();
    expect(result.date!.getFullYear()).toBe(2026);
    expect(result.date!.getMonth()).toBe(0);
    expect(result.date!.getDate()).toBe(15);
    expect(result.date!.getHours()).toBe(12);
  });

  it("accepts today", () => {
    expect(resolveSaleDate(todayLocal()).error).toBeUndefined();
  });

  it("allows tomorrow (timezone slack) but rejects later dates", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const t = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
    expect(resolveSaleDate(t).error).toBeUndefined();

    const farFuture = new Date();
    farFuture.setDate(farFuture.getDate() + 10);
    const f = `${farFuture.getFullYear()}-${String(farFuture.getMonth() + 1).padStart(2, "0")}-${String(farFuture.getDate()).padStart(2, "0")}`;
    expect(resolveSaleDate(f).error).toBe("La fecha no puede ser futura.");
  });

  it("rejects malformed input", () => {
    expect(resolveSaleDate("15/01/2026").error).toBe("Fecha inválida.");
    expect(resolveSaleDate("not-a-date").error).toBe("Fecha inválida.");
    expect(resolveSaleDate("2026-1-5").error).toBe("Fecha inválida.");
  });

  it("rejects impossible calendar dates", () => {
    expect(resolveSaleDate("2026-13-45").error).toBe("Fecha inválida.");
  });
});

describe("todayLocal", () => {
  it("returns YYYY-MM-DD matching the local date", () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    expect(todayLocal()).toBe(expected);
  });
});
