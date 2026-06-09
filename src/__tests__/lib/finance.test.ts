import { describe, it, expect } from "vitest";
import {
  calcSaleTotal,
  calcCostPerUnit,
  netChannelRevenue,
  calcRecoveryPct,
  isFullyRecovered,
  calcMomPercent,
  calcStockInHand,
  calcInBookstores,
  calcInExchanges,
  calcMerchStock,
  getExchangeStatusMeta,
  calcProjectionScenarios,
  calc3MonthAvg,
  resolveExpenseAssignments,
  shouldTrackBookInventory,
  calcOutstanding,
  toBaseCurrency,
  saleToCLP,
  resolvePricing,
} from "@/lib/finance";

// ─────────────────────────────────────────────────────────────────────────────
// calcSaleTotal
// ─────────────────────────────────────────────────────────────────────────────

describe("calcSaleTotal", () => {
  it("multiplies quantity by unit price", () => {
    expect(calcSaleTotal(3, 8000)).toBe(24000);
  });

  it("returns 0 when quantity is 0", () => {
    expect(calcSaleTotal(0, 8000)).toBe(0);
  });

  it("returns 0 when unit price is 0", () => {
    expect(calcSaleTotal(5, 0)).toBe(0);
  });

  it("handles fractional prices", () => {
    expect(calcSaleTotal(2, 4.99)).toBeCloseTo(9.98);
  });

  it("handles large quantities", () => {
    expect(calcSaleTotal(1000, 500)).toBe(500000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calcCostPerUnit
// ─────────────────────────────────────────────────────────────────────────────

describe("calcCostPerUnit", () => {
  it("divides total cost by quantity", () => {
    expect(calcCostPerUnit(500000, 200)).toBe(2500);
  });

  it("returns 0 when quantity is 0 (div-by-zero guard)", () => {
    expect(calcCostPerUnit(500000, 0)).toBe(0);
  });

  it("returns exact decimal result", () => {
    expect(calcCostPerUnit(100, 3)).toBeCloseTo(33.333);
  });

  it("returns 0 when total cost is 0", () => {
    expect(calcCostPerUnit(0, 100)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// netChannelRevenue
// ─────────────────────────────────────────────────────────────────────────────

describe("netChannelRevenue", () => {
  describe("DIGITAL channel", () => {
    it("applies royalty percentage", () => {
      expect(netChannelRevenue(10000, "DIGITAL", 70, null)).toBe(7000);
    });

    it("applies 35% royalty (Amazon paperback)", () => {
      expect(netChannelRevenue(10000, "DIGITAL", 35, null)).toBe(3500);
    });

    it("returns full gross when royaltyPct is null", () => {
      expect(netChannelRevenue(10000, "DIGITAL", null, null)).toBe(10000);
    });

    it("returns 0 on zero gross", () => {
      expect(netChannelRevenue(0, "DIGITAL", 70, null)).toBe(0);
    });
  });

  describe("BOOKSTORE channel", () => {
    it("author receives 100% minus consignment cut", () => {
      // Librería takes 40%, author gets 60%
      expect(netChannelRevenue(10000, "BOOKSTORE", null, 40)).toBe(6000);
    });

    it("handles 30% consignment cut", () => {
      expect(netChannelRevenue(10000, "BOOKSTORE", null, 30)).toBe(7000);
    });

    it("returns full gross when consignmentPct is null", () => {
      expect(netChannelRevenue(10000, "BOOKSTORE", null, null)).toBe(10000);
    });
  });

  describe("DIRECT channel", () => {
    it("returns full gross regardless of percentage params", () => {
      expect(netChannelRevenue(8000, "DIRECT", 70, 40)).toBe(8000);
    });

    it("returns full gross with null percentages", () => {
      expect(netChannelRevenue(8000, "DIRECT", null, null)).toBe(8000);
    });
  });

  describe("PRESALE channel", () => {
    it("returns full gross amount", () => {
      expect(netChannelRevenue(5000, "PRESALE", null, null)).toBe(5000);
    });
  });

  it("ignores consignmentPct when channel is DIGITAL", () => {
    // DIGITAL uses royaltyPct — consignmentPct should not be applied
    expect(netChannelRevenue(10000, "DIGITAL", 70, 40)).toBe(7000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calcRecoveryPct
// ─────────────────────────────────────────────────────────────────────────────

describe("calcRecoveryPct", () => {
  it("returns 0 when cost is 0 (no investment)", () => {
    expect(calcRecoveryPct(5000, 0)).toBe(0);
  });

  it("returns 0 when revenue is 0", () => {
    expect(calcRecoveryPct(0, 100000)).toBe(0);
  });

  it("returns 50 when half recovered", () => {
    expect(calcRecoveryPct(50000, 100000)).toBe(50);
  });

  it("returns 100 when fully recovered", () => {
    expect(calcRecoveryPct(100000, 100000)).toBe(100);
  });

  it("caps at 100 when revenue exceeds cost", () => {
    expect(calcRecoveryPct(200000, 100000)).toBe(100);
  });

  it("handles fractional percentages", () => {
    expect(calcRecoveryPct(75000, 100000)).toBe(75);
  });

  it("returns 0 when cost is negative (guard)", () => {
    expect(calcRecoveryPct(5000, -100)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isFullyRecovered
// ─────────────────────────────────────────────────────────────────────────────

describe("isFullyRecovered", () => {
  it("true when revenue equals cost", () => {
    expect(isFullyRecovered(100000, 100000)).toBe(true);
  });

  it("true when revenue exceeds cost", () => {
    expect(isFullyRecovered(150000, 100000)).toBe(true);
  });

  it("false when revenue is less than cost", () => {
    expect(isFullyRecovered(80000, 100000)).toBe(false);
  });

  it("false when revenue is 0", () => {
    expect(isFullyRecovered(0, 100000)).toBe(false);
  });

  it("false when cost is 0 (no investment to recover)", () => {
    expect(isFullyRecovered(50000, 0)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calcMomPercent
// ─────────────────────────────────────────────────────────────────────────────

describe("calcMomPercent", () => {
  it("returns positive % for growth", () => {
    expect(calcMomPercent(1200, 1000)).toBeCloseTo(20);
  });

  it("returns negative % for decline", () => {
    expect(calcMomPercent(800, 1000)).toBeCloseTo(-20);
  });

  it("returns 0 when both are equal", () => {
    expect(calcMomPercent(1000, 1000)).toBe(0);
  });

  it("returns 100 when previous was 0 and current is positive (new revenue)", () => {
    expect(calcMomPercent(500, 0)).toBe(100);
  });

  it("returns 0 when both are 0", () => {
    expect(calcMomPercent(0, 0)).toBe(0);
  });

  it("handles large growth correctly", () => {
    expect(calcMomPercent(3000, 1000)).toBeCloseTo(200);
  });

  it("returns 0 when current is 0 and previous is also 0", () => {
    expect(calcMomPercent(0, 0)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calcStockInHand
// ─────────────────────────────────────────────────────────────────────────────

describe("calcStockInHand", () => {
  it("returns 0 for empty movements", () => {
    expect(calcStockInHand([])).toBe(0);
  });

  it("adds a new print run", () => {
    expect(calcStockInHand([{ type: "NEW_PRINT_RUN", quantity: 200 }])).toBe(200);
  });

  it("subtracts a direct sale", () => {
    expect(calcStockInHand([
      { type: "NEW_PRINT_RUN",  quantity: 200 },
      { type: "DIRECT_SALE",    quantity: 5   },
    ])).toBe(195);
  });

  it("subtracts books sent to bookstore", () => {
    expect(calcStockInHand([
      { type: "NEW_PRINT_RUN",     quantity: 200 },
      { type: "SEND_TO_BOOKSTORE", quantity: 30  },
    ])).toBe(170);
  });

  it("adds back bookstore returns", () => {
    expect(calcStockInHand([
      { type: "NEW_PRINT_RUN",     quantity: 200 },
      { type: "SEND_TO_BOOKSTORE", quantity: 30  },
      { type: "BOOKSTORE_RETURN",  quantity: 10  },
    ])).toBe(180);
  });

  it("subtracts exchanges (send to influencer)", () => {
    expect(calcStockInHand([
      { type: "NEW_PRINT_RUN",       quantity: 200 },
      { type: "SEND_TO_INFLUENCER",  quantity: 3   },
    ])).toBe(197);
  });

  it("subtracts writeoffs", () => {
    expect(calcStockInHand([
      { type: "NEW_PRINT_RUN", quantity: 200 },
      { type: "WRITEOFF",      quantity: 2   },
    ])).toBe(198);
  });

  it("subtracts bundle assembly", () => {
    expect(calcStockInHand([
      { type: "NEW_PRINT_RUN",   quantity: 200 },
      { type: "BUNDLE_ASSEMBLY", quantity: 10  },
    ])).toBe(190);
  });

  it("treats unknown movement types as 0 (no effect)", () => {
    expect(calcStockInHand([
      { type: "NEW_PRINT_RUN",  quantity: 200 },
      { type: "MERCHANDISE_ENTRY", quantity: 50 },
    ])).toBe(200);
  });

  it("handles multiple print runs", () => {
    expect(calcStockInHand([
      { type: "NEW_PRINT_RUN", quantity: 200 },
      { type: "NEW_PRINT_RUN", quantity: 300 },
      { type: "DIRECT_SALE",   quantity: 100 },
    ])).toBe(400);
  });

  it("can return negative stock (oversold or data error — do not clamp here)", () => {
    expect(calcStockInHand([
      { type: "NEW_PRINT_RUN", quantity: 10 },
      { type: "DIRECT_SALE",   quantity: 15 },
    ])).toBe(-5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calcInBookstores
// ─────────────────────────────────────────────────────────────────────────────

describe("calcInBookstores", () => {
  it("returns 0 for empty movements", () => {
    expect(calcInBookstores([])).toBe(0);
  });

  it("adds units sent to bookstore", () => {
    expect(calcInBookstores([{ type: "SEND_TO_BOOKSTORE", quantity: 50 }])).toBe(50);
  });

  it("subtracts returned units", () => {
    expect(calcInBookstores([
      { type: "SEND_TO_BOOKSTORE", quantity: 50 },
      { type: "BOOKSTORE_RETURN",  quantity: 10 },
    ])).toBe(40);
  });

  it("accumulates multiple sends", () => {
    expect(calcInBookstores([
      { type: "SEND_TO_BOOKSTORE", quantity: 30 },
      { type: "SEND_TO_BOOKSTORE", quantity: 20 },
    ])).toBe(50);
  });

  it("ignores non-bookstore movements", () => {
    expect(calcInBookstores([
      { type: "SEND_TO_BOOKSTORE", quantity: 50 },
      { type: "DIRECT_SALE",       quantity: 5  },
      { type: "NEW_PRINT_RUN",     quantity: 200 },
    ])).toBe(50);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calcInExchanges
// ─────────────────────────────────────────────────────────────────────────────

describe("calcInExchanges", () => {
  it("returns 0 for empty movements", () => {
    expect(calcInExchanges([])).toBe(0);
  });

  it("sums SEND_TO_INFLUENCER movements", () => {
    expect(calcInExchanges([{ type: "SEND_TO_INFLUENCER", quantity: 3 }])).toBe(3);
  });

  it("accumulates multiple influencer sends", () => {
    expect(calcInExchanges([
      { type: "SEND_TO_INFLUENCER", quantity: 2 },
      { type: "SEND_TO_INFLUENCER", quantity: 1 },
    ])).toBe(3);
  });

  it("ignores non-exchange movements", () => {
    expect(calcInExchanges([
      { type: "SEND_TO_INFLUENCER", quantity: 3 },
      { type: "NEW_PRINT_RUN",      quantity: 200 },
      { type: "DIRECT_SALE",        quantity: 5   },
    ])).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calcMerchStock
// ─────────────────────────────────────────────────────────────────────────────

describe("calcMerchStock", () => {
  it("returns batched minus sold", () => {
    expect(calcMerchStock(100, 30)).toBe(70);
  });

  it("returns 0 when nothing batched and nothing sold", () => {
    expect(calcMerchStock(0, 0)).toBe(0);
  });

  it("returns negative when sold exceeds batched", () => {
    expect(calcMerchStock(10, 15)).toBe(-5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getExchangeStatusMeta
// ─────────────────────────────────────────────────────────────────────────────

describe("getExchangeStatusMeta", () => {
  const now = new Date("2025-06-15T12:00:00Z");
  const past   = new Date("2025-06-01T12:00:00Z");
  const future = new Date("2025-07-01T12:00:00Z");

  describe("FULFILLED", () => {
    it("returns green dot regardless of deadline", () => {
      const meta = getExchangeStatusMeta("FULFILLED", null, now);
      expect(meta.dot).toBe("🟢");
      expect(meta.label).toBe("Cumplido");
    });

    it("returns green even if deadline is past", () => {
      const meta = getExchangeStatusMeta("FULFILLED", past, now);
      expect(meta.dot).toBe("🟢");
    });
  });

  describe("UNFULFILLED", () => {
    it("returns red dot", () => {
      const meta = getExchangeStatusMeta("UNFULFILLED", null, now);
      expect(meta.dot).toBe("🔴");
      expect(meta.label).toBe("No cumplido");
    });
  });

  describe("PENDING", () => {
    it("returns yellow when no deadline", () => {
      const meta = getExchangeStatusMeta("PENDING", null, now);
      expect(meta.dot).toBe("🟡");
      expect(meta.label).toBe("Pendiente");
    });

    it("returns yellow when deadline is in the future", () => {
      const meta = getExchangeStatusMeta("PENDING", future, now);
      expect(meta.dot).toBe("🟡");
    });

    it("returns red when deadline has passed (overdue)", () => {
      const meta = getExchangeStatusMeta("PENDING", past, now);
      expect(meta.dot).toBe("🔴");
      expect(meta.label).toBe("Vencido");
    });

    it("uses current time by default (smoke test)", () => {
      const meta = getExchangeStatusMeta("PENDING", null);
      expect(meta.dot).toBe("🟡");
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calcProjectionScenarios
// ─────────────────────────────────────────────────────────────────────────────

describe("calcProjectionScenarios", () => {
  it("calculates three scenarios from baseline", () => {
    const s = calcProjectionScenarios(1000);
    expect(s.realista).toBe(1000);
    expect(s.conservador).toBe(800);
    expect(s.optimista).toBe(1200);
  });

  it("returns zeros when average is 0", () => {
    const s = calcProjectionScenarios(0);
    expect(s.realista).toBe(0);
    expect(s.conservador).toBe(0);
    expect(s.optimista).toBe(0);
  });

  it("rounds results to nearest integer", () => {
    const s = calcProjectionScenarios(333.33);
    expect(Number.isInteger(s.realista)).toBe(true);
    expect(Number.isInteger(s.conservador)).toBe(true);
    expect(Number.isInteger(s.optimista)).toBe(true);
  });

  it("conservador is always less than realista", () => {
    const s = calcProjectionScenarios(500);
    expect(s.conservador).toBeLessThan(s.realista);
  });

  it("optimista is always greater than realista", () => {
    const s = calcProjectionScenarios(500);
    expect(s.optimista).toBeGreaterThan(s.realista);
  });

  it("conservador is 80% of realista (−20%)", () => {
    const s = calcProjectionScenarios(1000);
    expect(s.conservador / s.realista).toBeCloseTo(0.8);
  });

  it("optimista is 120% of realista (+20%)", () => {
    const s = calcProjectionScenarios(1000);
    expect(s.optimista / s.realista).toBeCloseTo(1.2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calc3MonthAvg
// ─────────────────────────────────────────────────────────────────────────────

describe("calc3MonthAvg", () => {
  it("returns 0 for empty series", () => {
    expect(calc3MonthAvg([])).toBe(0);
  });

  it("returns the single value for a one-element series", () => {
    expect(calc3MonthAvg([500])).toBe(500);
  });

  it("averages last 3 elements of a longer series", () => {
    expect(calc3MonthAvg([100, 200, 300, 400, 500, 600])).toBe(500);
  });

  it("averages exactly 3 elements", () => {
    expect(calc3MonthAvg([1000, 2000, 3000])).toBe(2000);
  });

  it("averages 2 elements when series has only 2", () => {
    expect(calc3MonthAvg([1000, 2000])).toBe(1500);
  });

  it("handles all zeros", () => {
    expect(calc3MonthAvg([0, 0, 0])).toBe(0);
  });

  it("ignores elements before the last 3", () => {
    // Only the last 3 (400, 500, 600) should matter
    const withEarly  = calc3MonthAvg([9999, 9999, 400, 500, 600]);
    const withoutEarly = calc3MonthAvg([400, 500, 600]);
    expect(withEarly).toBe(withoutEarly);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// resolveExpenseAssignments
// ─────────────────────────────────────────────────────────────────────────────

describe("resolveExpenseAssignments", () => {
  const BOOK_ID       = "book-123";
  const PRINT_RUN_ID  = "run-456";

  describe("GENERAL level", () => {
    it("sets both IDs to null regardless of inputs", () => {
      expect(resolveExpenseAssignments("GENERAL", BOOK_ID, PRINT_RUN_ID))
        .toEqual({ bookId: null, printRunId: null });
    });

    it("returns null IDs when no IDs provided", () => {
      expect(resolveExpenseAssignments("GENERAL"))
        .toEqual({ bookId: null, printRunId: null });
    });
  });

  describe("BOOK level", () => {
    it("sets bookId and forces printRunId to null", () => {
      expect(resolveExpenseAssignments("BOOK", BOOK_ID, PRINT_RUN_ID))
        .toEqual({ bookId: BOOK_ID, printRunId: null });
    });

    it("sets bookId to null when not provided", () => {
      expect(resolveExpenseAssignments("BOOK"))
        .toEqual({ bookId: null, printRunId: null });
    });
  });

  describe("PRINT_RUN level", () => {
    it("sets both IDs when both are provided", () => {
      expect(resolveExpenseAssignments("PRINT_RUN", BOOK_ID, PRINT_RUN_ID))
        .toEqual({ bookId: BOOK_ID, printRunId: PRINT_RUN_ID });
    });

    it("sets printRunId to null when not provided", () => {
      expect(resolveExpenseAssignments("PRINT_RUN", BOOK_ID))
        .toEqual({ bookId: BOOK_ID, printRunId: null });
    });

    it("sets both to null when neither provided", () => {
      expect(resolveExpenseAssignments("PRINT_RUN"))
        .toEqual({ bookId: null, printRunId: null });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// shouldTrackBookInventory
// ─────────────────────────────────────────────────────────────────────────────

describe("shouldTrackBookInventory", () => {
  it("returns true for DIRECT channel + PRINT format", () => {
    expect(shouldTrackBookInventory("DIRECT", ["PRINT"])).toBe(true);
  });

  it("returns true for DIRECT + mixed formats including PRINT", () => {
    expect(shouldTrackBookInventory("DIRECT", ["PRINT", "EBOOK"])).toBe(true);
  });

  it("returns false for DIGITAL channel even with PRINT format", () => {
    expect(shouldTrackBookInventory("DIGITAL", ["PRINT"])).toBe(false);
  });

  it("returns false for BOOKSTORE channel", () => {
    expect(shouldTrackBookInventory("BOOKSTORE", ["PRINT"])).toBe(false);
  });

  it("returns false for PRESALE channel", () => {
    expect(shouldTrackBookInventory("PRESALE", ["PRINT"])).toBe(false);
  });

  it("returns false for DIRECT channel with only EBOOK format", () => {
    expect(shouldTrackBookInventory("DIRECT", ["EBOOK"])).toBe(false);
  });

  it("returns false for DIRECT channel with only AUDIOBOOK format", () => {
    expect(shouldTrackBookInventory("DIRECT", ["AUDIOBOOK"])).toBe(false);
  });

  it("returns false for DIRECT channel with empty formats array", () => {
    expect(shouldTrackBookInventory("DIRECT", [])).toBe(false);
  });

  it("returns false for unknown channel type", () => {
    expect(shouldTrackBookInventory("UNKNOWN", ["PRINT"])).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calcOutstanding
// ─────────────────────────────────────────────────────────────────────────────

describe("calcOutstanding", () => {
  it("returns 0 when nothing earned and nothing received", () => {
    expect(calcOutstanding(0, 0)).toBe(0);
  });

  it("returns full earned amount when nothing has been received", () => {
    expect(calcOutstanding(10000, 0)).toBe(10000);
  });

  it("returns 0 when received equals earned (fully paid)", () => {
    expect(calcOutstanding(10000, 10000)).toBe(0);
  });

  it("returns 0 when received exceeds earned (overpaid — no negative balance)", () => {
    expect(calcOutstanding(10000, 12000)).toBe(0);
  });

  it("returns the unpaid difference when partially paid", () => {
    expect(calcOutstanding(10000, 6000)).toBe(4000);
  });

  it("handles large amounts correctly", () => {
    expect(calcOutstanding(1_500_000, 900_000)).toBe(600_000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// toBaseCurrency
// ─────────────────────────────────────────────────────────────────────────────

describe("toBaseCurrency", () => {
  it("returns amountCLP when stored (normal post-migration path)", () => {
    expect(toBaseCurrency(104_000, 65_520, "ARS")).toBe(65_520);
  });

  it("returns amountCLP even when zero (explicit zero is valid)", () => {
    expect(toBaseCurrency(100, 0, "ARS")).toBe(0);
  });

  it("falls back to amount when amountCLP is null and currency is CLP", () => {
    expect(toBaseCurrency(50_000, null, "CLP")).toBe(50_000);
  });

  it("returns 0 when amountCLP is null and currency is not CLP (legacy foreign record with no rate)", () => {
    expect(toBaseCurrency(104_000, null, "ARS")).toBe(0);
  });

  it("CLP sale with amountCLP stored returns amountCLP", () => {
    expect(toBaseCurrency(8_000, 8_000, "CLP")).toBe(8_000);
  });

  it("handles USD with stored amountCLP", () => {
    expect(toBaseCurrency(100, 97_000, "USD")).toBe(97_000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// saleToCLP
// ─────────────────────────────────────────────────────────────────────────────

describe("saleToCLP", () => {
  it("returns amountCLP when stored (normal path)", () => {
    expect(saleToCLP({ totalAmount: 104_000, amountCLP: 65_520, currency: "ARS" })).toBe(65_520);
  });

  it("falls back to totalAmount when amountCLP is null and currency is CLP", () => {
    expect(saleToCLP({ totalAmount: 8_000, amountCLP: null, currency: "CLP" })).toBe(8_000);
  });

  it("falls back to totalAmount when amountCLP is undefined and currency is CLP", () => {
    expect(saleToCLP({ totalAmount: 8_000, currency: "CLP" })).toBe(8_000);
  });

  it("returns 0 when amountCLP is null and currency is foreign", () => {
    expect(saleToCLP({ totalAmount: 104_000, amountCLP: null, currency: "ARS" })).toBe(0);
  });

  it("returns 0 when amountCLP is undefined and currency is foreign", () => {
    expect(saleToCLP({ totalAmount: 104_000, currency: "USD" })).toBe(0);
  });

  it("handles Decimal-like objects (toString) for amountCLP", () => {
    const decimalLike = { toString: () => "65520.00" };
    expect(saleToCLP({ totalAmount: 104_000, amountCLP: decimalLike, currency: "ARS" })).toBe(65_520);
  });

  it("handles Decimal-like objects for totalAmount fallback", () => {
    const decimalLike = { toString: () => "8000.00" };
    expect(saleToCLP({ totalAmount: decimalLike, amountCLP: null, currency: "CLP" })).toBe(8_000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// resolvePricing
// ─────────────────────────────────────────────────────────────────────────────

describe("resolvePricing", () => {
  describe("per-unit mode", () => {
    it("computes total from quantity × unitPrice", () => {
      expect(resolvePricing({ isBulk: false, unitPrice: 8000, quantity: 3 }))
        .toEqual({ unit: 8000, total: 24000 });
    });

    it("allows unit price of 0 (free item)", () => {
      expect(resolvePricing({ isBulk: false, unitPrice: 0, quantity: 2 }))
        .toEqual({ unit: 0, total: 0 });
    });

    it("rejects missing unit price", () => {
      expect(resolvePricing({ isBulk: false, quantity: 2 }))
        .toEqual({ error: "El precio es obligatorio." });
    });

    it("rejects negative unit price", () => {
      expect(resolvePricing({ isBulk: false, unitPrice: -1, quantity: 2 }))
        .toEqual({ error: "El precio no puede ser negativo." });
    });

    it("rejects NaN unit price", () => {
      expect(resolvePricing({ isBulk: false, unitPrice: NaN, quantity: 2 }))
        .toEqual({ error: "El precio es obligatorio." });
    });
  });

  describe("bulk mode", () => {
    it("stores the total verbatim and derives the average unit price", () => {
      const r = resolvePricing({ isBulk: true, totalAmount: 75000, quantity: 7 });
      expect("error" in r).toBe(false);
      if ("total" in r) {
        expect(r.total).toBe(75000);            // exact — no rounding loss
        expect(r.unit).toBeCloseTo(10714.2857);
      }
    });

    it("ignores unitPrice when bulk", () => {
      const r = resolvePricing({ isBulk: true, totalAmount: 50000, unitPrice: 999, quantity: 5 });
      if ("total" in r) {
        expect(r.total).toBe(50000);
        expect(r.unit).toBe(10000);
      }
    });

    it("rejects missing total", () => {
      expect(resolvePricing({ isBulk: true, quantity: 5 }))
        .toEqual({ error: "El monto total es obligatorio." });
    });

    it("rejects negative total", () => {
      expect(resolvePricing({ isBulk: true, totalAmount: -100, quantity: 5 }))
        .toEqual({ error: "El monto no puede ser negativo." });
    });

    it("allows a total of 0 (gifted bundle)", () => {
      expect(resolvePricing({ isBulk: true, totalAmount: 0, quantity: 3 }))
        .toEqual({ total: 0, unit: 0 });
    });
  });
});
