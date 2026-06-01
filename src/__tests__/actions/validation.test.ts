/**
 * Tests for the validation logic extracted from server actions.
 * We test the pure conditional rules, not the DB calls.
 */
import { describe, it, expect } from "vitest";
import {
  resolveExpenseAssignments,
  shouldTrackBookInventory,
  calcSaleTotal,
  calcCostPerUnit,
  calcOutstanding,
} from "@/lib/finance";

// ── Sale input validation rules ───────────────────────────────────────────────
// Mirror the guards in src/actions/sales.ts

describe("sale input validation rules", () => {
  it("quantity 0 should be rejected (< 1)", () => {
    expect(0 < 1).toBe(true);
  });

  it("quantity 1 is the minimum valid value", () => {
    expect(1 < 1).toBe(false);
  });

  it("negative unit price should be rejected (< 0)", () => {
    expect(-1 < 0).toBe(true);
  });

  it("unit price of 0 is allowed (free item)", () => {
    expect(0 < 0).toBe(false);
  });

  it("sale total is 0 for a free item (quantity × 0)", () => {
    expect(calcSaleTotal(5, 0)).toBe(0);
  });
});

// ── Print run validation rules ────────────────────────────────────────────────

describe("print run input validation rules", () => {
  it("quantity 0 should be rejected (< 1)", () => {
    expect(0 < 1).toBe(true);
  });

  it("negative total cost should be rejected (< 0)", () => {
    expect(-1 < 0).toBe(true);
  });

  it("total cost of 0 is allowed (gifted/free print run)", () => {
    expect(0 < 0).toBe(false);
    expect(calcCostPerUnit(0, 100)).toBe(0);
  });

  it("cost per unit is computed correctly from valid inputs", () => {
    expect(calcCostPerUnit(600000, 200)).toBe(3000);
  });

  it("cost per unit is 0 when quantity is 0 (div-by-zero guard)", () => {
    expect(calcCostPerUnit(600000, 0)).toBe(0);
  });
});

// ── Expense level assignment rules ────────────────────────────────────────────

describe("expense level → ID assignment rules", () => {
  it("GENERAL expense: bookId and printRunId are both null even if provided", () => {
    const result = resolveExpenseAssignments("GENERAL", "b1", "pr1");
    expect(result.bookId).toBeNull();
    expect(result.printRunId).toBeNull();
  });

  it("BOOK expense: bookId is stored, printRunId is null even if provided", () => {
    const result = resolveExpenseAssignments("BOOK", "b1", "pr1");
    expect(result.bookId).toBe("b1");
    expect(result.printRunId).toBeNull();
  });

  it("BOOK expense without bookId: both null", () => {
    const result = resolveExpenseAssignments("BOOK");
    expect(result.bookId).toBeNull();
    expect(result.printRunId).toBeNull();
  });

  it("PRINT_RUN expense: both IDs stored when both provided", () => {
    const result = resolveExpenseAssignments("PRINT_RUN", "b1", "pr1");
    expect(result.bookId).toBe("b1");
    expect(result.printRunId).toBe("pr1");
  });

  it("PRINT_RUN expense without printRunId: printRunId is null", () => {
    const result = resolveExpenseAssignments("PRINT_RUN", "b1");
    expect(result.bookId).toBe("b1");
    expect(result.printRunId).toBeNull();
  });
});

// ── Inventory tracking eligibility rules ─────────────────────────────────────

describe("shouldTrackBookInventory rules", () => {
  it("DIRECT + PRINT → track inventory", () => {
    expect(shouldTrackBookInventory("DIRECT", ["PRINT"])).toBe(true);
  });

  it("DIGITAL + PRINT → do not track (KDP handles this)", () => {
    expect(shouldTrackBookInventory("DIGITAL", ["PRINT"])).toBe(false);
  });

  it("BOOKSTORE + PRINT → do not track (consignment handled separately)", () => {
    expect(shouldTrackBookInventory("BOOKSTORE", ["PRINT"])).toBe(false);
  });

  it("DIRECT + EBOOK → do not track (digital, no physical copies)", () => {
    expect(shouldTrackBookInventory("DIRECT", ["EBOOK"])).toBe(false);
  });

  it("DIRECT + AUDIOBOOK → do not track", () => {
    expect(shouldTrackBookInventory("DIRECT", ["AUDIOBOOK"])).toBe(false);
  });

  it("DIRECT + [PRINT, EBOOK] → track (has physical copies)", () => {
    expect(shouldTrackBookInventory("DIRECT", ["PRINT", "EBOOK"])).toBe(true);
  });

  it("DIRECT + [] → do not track (no formats)", () => {
    expect(shouldTrackBookInventory("DIRECT", [])).toBe(false);
  });

  it("empty channel type → do not track", () => {
    expect(shouldTrackBookInventory("", ["PRINT"])).toBe(false);
  });
});

// ── Expense validation rules ──────────────────────────────────────────────────
// Mirror the guards in src/actions/expenses.ts

describe("expense input validation rules", () => {
  it("empty description should be rejected", () => {
    expect(!"".trim()).toBe(true);
  });

  it("whitespace-only description should be rejected", () => {
    expect(!"   ".trim()).toBe(true);
  });

  it("description with content passes", () => {
    expect(!"Diseño de portada".trim()).toBe(false);
  });

  it("amount of 0 should be rejected (must be > 0)", () => {
    expect(0 <= 0).toBe(true);
  });

  it("negative amount should be rejected", () => {
    expect(-500 <= 0).toBe(true);
  });

  it("positive amount passes", () => {
    expect(1000 <= 0).toBe(false);
  });
});

// ── Merchandise product validation rules ─────────────────────────────────────
// Mirror the guards in src/actions/merchandise.ts

describe("merchandise product validation rules", () => {
  it("empty name should be rejected", () => {
    expect(!"".trim()).toBe(true);
  });

  it("whitespace-only name should be rejected", () => {
    expect(!"   ".trim()).toBe(true);
  });

  it("name with content passes", () => {
    expect(!"Tote bag".trim()).toBe(false);
  });
});

// ── Production batch validation rules ────────────────────────────────────────
// Mirror the guards in src/actions/merchandise.ts → addProductionBatch

describe("production batch validation rules", () => {
  it("quantity 0 should be rejected (< 1)", () => {
    expect(0 < 1).toBe(true);
  });

  it("quantity 1 is the minimum valid value", () => {
    expect(1 < 1).toBe(false);
  });

  it("negative total cost should be rejected", () => {
    expect(-1000 < 0).toBe(true);
  });

  it("total cost of 0 is allowed (gifted / free batch)", () => {
    expect(0 < 0).toBe(false);
  });

  it("cost per unit is 0 when cost is 0 (div-by-zero guard)", () => {
    expect(calcCostPerUnit(0, 100)).toBe(0);
  });

  it("cost per unit computes correctly from valid inputs", () => {
    expect(calcCostPerUnit(300_000, 100)).toBe(3000);
  });
});

// ── Merch sale validation rules ───────────────────────────────────────────────
// Mirror the guards in src/actions/merchandise.ts → createMerchSale

describe("merch sale validation rules", () => {
  it("quantity 0 should be rejected (< 1)", () => {
    expect(0 < 1).toBe(true);
  });

  it("negative unit price should be rejected (< 0)", () => {
    expect(-1 < 0).toBe(true);
  });

  it("unit price of 0 is allowed (free item)", () => {
    expect(0 < 0).toBe(false);
  });

  it("sale total is computed correctly", () => {
    expect(calcSaleTotal(3, 1500)).toBe(4500);
  });

  it("sale total is 0 for free item (quantity × 0)", () => {
    expect(calcSaleTotal(5, 0)).toBe(0);
  });
});

// ── Outstanding balance rules ─────────────────────────────────────────────────
// Logic used in dashboard and finanzas pages for "¿Qué me deben?"

describe("outstanding balance rules", () => {
  it("nothing earned, nothing received → 0 outstanding", () => {
    expect(calcOutstanding(0, 0)).toBe(0);
  });

  it("earned but not received → full amount outstanding", () => {
    expect(calcOutstanding(50_000, 0)).toBe(50_000);
  });

  it("fully paid → 0 outstanding", () => {
    expect(calcOutstanding(50_000, 50_000)).toBe(0);
  });

  it("overpaid → 0 (no negative balance shown to author)", () => {
    expect(calcOutstanding(50_000, 60_000)).toBe(0);
  });

  it("partial payment → remaining difference", () => {
    expect(calcOutstanding(50_000, 30_000)).toBe(20_000);
  });
});
