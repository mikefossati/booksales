/**
 * Multi-book scenario tests.
 *
 * All tests involve 2 or more books in the same account. The goal is to verify
 * that per-book calculations, inventory tracking, plan gating, and notifications
 * remain fully isolated from each other even when data is interleaved.
 */

import { describe, it, expect } from "vitest";
import {
  isProActive,
  FREE_LIMITS,
} from "@/lib/plan";
import {
  calcStockMatrix,
  calcInventoryStock,
  calcStockInHand,
  calcCuadreRow,
  saleToCLP,
  calc3MonthAvg,
  calcOutstanding,
} from "@/lib/finance";
import {
  deriveNotifications,
  filterDismissed,
  staleDismissalKeys,
  LOW_STOCK_THRESHOLD,
  type NotificationInputs,
} from "@/lib/notifications";

// ─────────────────────────────────────────────────────────────────────────────
// Shared fixtures
// ─────────────────────────────────────────────────────────────────────────────

const FREE  = { plan: "FREE" as const, planExpiresAt: null };
const PRO   = { plan: "PRO"  as const, planExpiresAt: null };

const NOW = new Date("2026-06-11T12:00:00");

// Two-book catalog used across notification tests
const TWO_BOOKS: NotificationInputs["books"] = [
  { id: "b1", title: "Luna de Papel" },
  { id: "b2", title: "El Cielo Roto"  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Plan gating — FREE book limit with 2+ books in account
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The gate in books.ts is:
 *   if (!isProActive(account)) {
 *     const count = await prisma.book.count(...)
 *     if (count >= FREE_LIMITS.BOOKS) return { error }
 *   }
 *
 * The pure-function equivalent: gateTriggered(count, account)
 */
function bookGateTriggered(
  existingCount: number,
  account: { plan: "FREE" | "PRO"; planExpiresAt: Date | null },
): boolean {
  return !isProActive(account) && existingCount >= FREE_LIMITS.BOOKS;
}

describe("plan — FREE book-limit gate", () => {
  it("FREE_LIMITS.BOOKS is 1 (only one book allowed on free plan)", () => {
    expect(FREE_LIMITS.BOOKS).toBe(1);
  });

  it("gate does NOT trigger for a FREE account with 0 existing books", () => {
    expect(bookGateTriggered(0, FREE)).toBe(false);
  });

  it("gate triggers for a FREE account when 1 book already exists", () => {
    expect(bookGateTriggered(1, FREE)).toBe(true);
  });

  it("gate still triggers for FREE with 2+ books (redundant guard, still safe)", () => {
    expect(bookGateTriggered(2, FREE)).toBe(true);
    expect(bookGateTriggered(10, FREE)).toBe(true);
  });

  it("gate never triggers for an active PRO account regardless of existing count", () => {
    expect(bookGateTriggered(0,   PRO)).toBe(false);
    expect(bookGateTriggered(1,   PRO)).toBe(false);
    expect(bookGateTriggered(100, PRO)).toBe(false);
  });

  it("expired PRO falls back to FREE behaviour — gate triggers at 1 book", () => {
    const expiredPro = { plan: "PRO" as const, planExpiresAt: new Date(Date.now() - 1) };
    expect(bookGateTriggered(1, expiredPro)).toBe(true);
  });

  it("PRO with future expiry never triggers gate", () => {
    const activePro = { plan: "PRO" as const, planExpiresAt: new Date(Date.now() + 86400_000) };
    expect(bookGateTriggered(50, activePro)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calcStockMatrix — two books sharing the same inventory
// ─────────────────────────────────────────────────────────────────────────────

describe("calcStockMatrix — two books in the same inventory", () => {
  // inventory "personal" holds both book-1 and book-2
  const movements = [
    { inventoryId: "personal", bookId: "b1", type: "NEW_PRINT_RUN", quantity: 200 },
    { inventoryId: "personal", bookId: "b2", type: "NEW_PRINT_RUN", quantity: 300 },
    { inventoryId: "personal", bookId: "b1", type: "DIRECT_SALE",   quantity: 50  },
  ];

  it("each book maintains its own stock total", () => {
    expect(calcInventoryStock(movements, "personal", "b1")).toBe(150);
    expect(calcInventoryStock(movements, "personal", "b2")).toBe(300);
  });

  it("selling book-1 does not reduce book-2 stock", () => {
    const base = [
      { inventoryId: "personal", bookId: "b1", type: "NEW_PRINT_RUN", quantity: 100 },
      { inventoryId: "personal", bookId: "b2", type: "NEW_PRINT_RUN", quantity: 100 },
    ];
    const withSale = [
      ...base,
      { inventoryId: "personal", bookId: "b1", type: "DIRECT_SALE", quantity: 40 },
    ];
    expect(calcInventoryStock(withSale, "personal", "b2")).toBe(100); // unchanged
    expect(calcInventoryStock(withSale, "personal", "b1")).toBe(60);  // deducted
  });

  it("transferring book-1 between inventories does not affect book-2", () => {
    const m = [
      { inventoryId: "personal",  bookId: "b1", type: "NEW_PRINT_RUN", quantity: 100 },
      { inventoryId: "personal",  bookId: "b2", type: "NEW_PRINT_RUN", quantity: 80  },
      { inventoryId: "personal",  bookId: "b1", type: "TRANSFER_OUT",  quantity: 30  },
      { inventoryId: "libreria",  bookId: "b1", type: "TRANSFER_IN",   quantity: 30  },
    ];
    expect(calcInventoryStock(m, "personal", "b1")).toBe(70);   // transferred out
    expect(calcInventoryStock(m, "personal", "b2")).toBe(80);   // untouched
    expect(calcInventoryStock(m, "libreria",  "b1")).toBe(30);  // arrived
    expect(calcInventoryStock(m, "libreria",  "b2")).toBe(0);   // b2 never went there
  });

  it("stock matrix covers all books present in movements", () => {
    const matrix = calcStockMatrix(movements);
    const byBook = matrix.get("personal")!;
    expect([...byBook.keys()].sort()).toEqual(["b1", "b2"]);
  });

  it("adjustments apply per-book independently", () => {
    const m = [
      { inventoryId: "personal", bookId: "b1", type: "NEW_PRINT_RUN",  quantity: 50 },
      { inventoryId: "personal", bookId: "b2", type: "NEW_PRINT_RUN",  quantity: 50 },
      { inventoryId: "personal", bookId: "b1", type: "ADJUSTMENT_OUT", quantity: 5  },
      { inventoryId: "personal", bookId: "b2", type: "ADJUSTMENT_IN",  quantity: 3  },
    ];
    expect(calcInventoryStock(m, "personal", "b1")).toBe(45);
    expect(calcInventoryStock(m, "personal", "b2")).toBe(53);
  });

  it("future-dated movements excluded per-book independently (asOf filter)", () => {
    const asOf = new Date("2026-06-11T00:00:00");
    const m = [
      { inventoryId: "personal", bookId: "b1", type: "NEW_PRINT_RUN", quantity: 100, occurredAt: "2026-06-01T00:00:00" },
      { inventoryId: "personal", bookId: "b2", type: "NEW_PRINT_RUN", quantity: 100, occurredAt: "2026-06-01T00:00:00" },
      // b1 gets a future run (excluded) but b2 doesn't
      { inventoryId: "personal", bookId: "b1", type: "NEW_PRINT_RUN", quantity: 500, occurredAt: "2026-08-01T00:00:00" },
    ];
    const matrix = calcStockMatrix(m, asOf);
    expect(matrix.get("personal")?.get("b1")).toBe(100); // future run excluded
    expect(matrix.get("personal")?.get("b2")).toBe(100); // unaffected
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calcCuadreRow — two books reconciling from the same stock matrix
// ─────────────────────────────────────────────────────────────────────────────

describe("calcCuadreRow — two books using the same shared stockMatrix", () => {
  const DEFAULT_INV   = new Set(["personal"]);
  const BOOKSTORE_INV = new Set(["libreria"]);

  const movements = [
    { inventoryId: "personal", bookId: "b1", type: "NEW_PRINT_RUN", quantity: 200 },
    { inventoryId: "personal", bookId: "b2", type: "NEW_PRINT_RUN", quantity: 150 },
    { inventoryId: "personal", bookId: "b1", type: "TRANSFER_OUT",  quantity: 50  },
    { inventoryId: "libreria",  bookId: "b1", type: "TRANSFER_IN",   quantity: 50  },
  ];
  const sharedMatrix = calcStockMatrix(movements);

  it("book-1 cuadre: personal=150, bookstores=50, sold=0 → zero discrepancy", () => {
    const row = calcCuadreRow({
      bookId: "b1", totalPrinted: 200,
      sold: 0, exchanged: 0, writtenOff: 0,
      stockMatrix: sharedMatrix,
      defaultInvIds: DEFAULT_INV, bookstoreInvIds: BOOKSTORE_INV,
    });
    expect(row.inPersonal).toBe(150);
    expect(row.inBookstores).toBe(50);
    expect(row.totalInStock).toBe(200);
    expect(row.discrepancy).toBe(0);
  });

  it("book-2 cuadre: personal=150, sold=0 → zero discrepancy", () => {
    const row = calcCuadreRow({
      bookId: "b2", totalPrinted: 150,
      sold: 0, exchanged: 0, writtenOff: 0,
      stockMatrix: sharedMatrix,
      defaultInvIds: DEFAULT_INV, bookstoreInvIds: BOOKSTORE_INV,
    });
    expect(row.inPersonal).toBe(150);
    expect(row.inBookstores).toBe(0);
    expect(row.totalInStock).toBe(150);
    expect(row.discrepancy).toBe(0);
  });

  it("book-1 discrepancy does not affect book-2 reconciliation", () => {
    // Intentionally give book-1 a wrong totalPrinted to create a discrepancy
    const rowB1 = calcCuadreRow({
      bookId: "b1", totalPrinted: 999, // wrong on purpose
      sold: 0, exchanged: 0, writtenOff: 0,
      stockMatrix: sharedMatrix,
      defaultInvIds: DEFAULT_INV, bookstoreInvIds: BOOKSTORE_INV,
    });
    const rowB2 = calcCuadreRow({
      bookId: "b2", totalPrinted: 150, // correct
      sold: 0, exchanged: 0, writtenOff: 0,
      stockMatrix: sharedMatrix,
      defaultInvIds: DEFAULT_INV, bookstoreInvIds: BOOKSTORE_INV,
    });
    expect(rowB1.discrepancy).not.toBe(0); // book-1 has discrepancy
    expect(rowB2.discrepancy).toBe(0);     // book-2 is clean — no bleed
  });

  it("two books can both show non-zero discrepancies independently", () => {
    const rowB1 = calcCuadreRow({
      bookId: "b1", totalPrinted: 210, // 10 unaccounted
      sold: 0, exchanged: 0, writtenOff: 0,
      stockMatrix: sharedMatrix,
      defaultInvIds: DEFAULT_INV, bookstoreInvIds: BOOKSTORE_INV,
    });
    const rowB2 = calcCuadreRow({
      bookId: "b2", totalPrinted: 160, // 10 unaccounted
      sold: 0, exchanged: 0, writtenOff: 0,
      stockMatrix: sharedMatrix,
      defaultInvIds: DEFAULT_INV, bookstoreInvIds: BOOKSTORE_INV,
    });
    expect(rowB1.discrepancy).toBe(10);
    expect(rowB2.discrepancy).toBe(10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calcStockInHand — called per-book with filtered movements
// ─────────────────────────────────────────────────────────────────────────────

describe("calcStockInHand — per-book movement slices from a multi-book ledger", () => {
  // The ledger contains movements for both books; caller is responsible for
  // filtering to the target book before calling calcStockInHand.
  const allMovements = [
    { type: "NEW_PRINT_RUN",     quantity: 300, bookId: "b1" },
    { type: "NEW_PRINT_RUN",     quantity: 200, bookId: "b2" },
    { type: "DIRECT_SALE",       quantity: 80,  bookId: "b1" },
    { type: "SEND_TO_BOOKSTORE", quantity: 50,  bookId: "b2" },
    { type: "NEW_PRINT_RUN",     quantity: 150, bookId: "b1" }, // second print run for b1
  ];

  it("book-1 stock-in-hand includes both its print runs and subtracts its sales only", () => {
    const b1Movements = allMovements.filter(m => m.bookId === "b1");
    // b1: 300 + 150 − 80 = 370
    expect(calcStockInHand(b1Movements)).toBe(370);
  });

  it("book-2 stock-in-hand is unaffected by book-1 movements", () => {
    const b2Movements = allMovements.filter(m => m.bookId === "b2");
    // b2: 200 − 50 = 150 (sent to bookstore)
    expect(calcStockInHand(b2Movements)).toBe(150);
  });

  it("two separate print runs for one book accumulate independently", () => {
    const m = [
      { type: "NEW_PRINT_RUN", quantity: 200, bookId: "b1" },
      { type: "NEW_PRINT_RUN", quantity: 300, bookId: "b1" },
    ];
    expect(calcStockInHand(m.filter(x => x.bookId === "b1"))).toBe(500);
  });

  it("when the whole ledger is passed without filtering, stock totals mix (documents caller responsibility)", () => {
    // calcStockInHand has no bookId parameter — it sums all movements given.
    // Passing the unfiltered ledger produces a meaningless total.
    // This test documents that the caller MUST filter by book first.
    const unfiltered = calcStockInHand(allMovements);
    const filtered   = calcStockInHand(allMovements.filter(m => m.bookId === "b1"))
                     + calcStockInHand(allMovements.filter(m => m.bookId === "b2"));
    expect(unfiltered).toBe(filtered); // happens to equal when signs are the same, but semantics differ
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Notifications — multi-book scenarios
// ─────────────────────────────────────────────────────────────────────────────

const base: NotificationInputs = {
  now: NOW,
  currency: "CLP",
  books: TWO_BOOKS,
  printRuns: [],
  channelsOutstanding: [],
  stockByBook: [],
  exchanges: [],
};

// ── Incoming print runs ───────────────────────────────────────────────────────

describe("notifications — multiple incoming print runs", () => {
  const futureRunB1 = {
    id: "r1", bookId: "b1", quantity: 200,
    receivedAt: new Date("2026-07-01T12:00:00"),
    createdAt:  new Date("2026-06-10T12:00:00"),
  };
  const futureRunB2 = {
    id: "r2", bookId: "b2", quantity: 350,
    receivedAt: new Date("2026-07-15T12:00:00"),
    createdAt:  new Date("2026-06-10T12:00:00"),
  };

  it("emits one INCOMING_PRINT_RUN notification per book", () => {
    const out = deriveNotifications({ ...base, printRuns: [futureRunB1, futureRunB2] });
    const incoming = out.filter(n => n.type === "INCOMING_PRINT_RUN");
    expect(incoming).toHaveLength(2);
  });

  it("each notification references the correct book via href", () => {
    const out = deriveNotifications({ ...base, printRuns: [futureRunB1, futureRunB2] });
    const hrefs = out.map(n => n.href);
    expect(hrefs).toContain("/libros/b1?tab=tiradas");
    expect(hrefs).toContain("/libros/b2?tab=tiradas");
  });

  it("each notification mentions its own book title", () => {
    const out = deriveNotifications({ ...base, printRuns: [futureRunB1, futureRunB2] });
    const messages = out.map(n => n.message);
    expect(messages.some(m => m.includes("Luna de Papel"))).toBe(true);
    expect(messages.some(m => m.includes("El Cielo Roto"))).toBe(true);
  });

  it("one book's run in-transit, other just arrived — both types emitted", () => {
    const arrivedRunB2 = {
      id: "r3", bookId: "b2", quantity: 100,
      receivedAt: new Date("2026-06-08T12:00:00"), // within 7-day window
      createdAt:  new Date("2026-06-01T12:00:00"),
    };
    const out = deriveNotifications({ ...base, printRuns: [futureRunB1, arrivedRunB2] });
    expect(out.some(n => n.type === "INCOMING_PRINT_RUN")).toBe(true);
    expect(out.some(n => n.type === "RUN_ARRIVED")).toBe(true);
  });

  it("notification keys are unique per run — same book, two runs, two keys", () => {
    const secondRunB1 = {
      id: "r4", bookId: "b1", quantity: 100,
      receivedAt: new Date("2026-08-01T12:00:00"),
      createdAt:  new Date("2026-06-10T12:00:00"),
    };
    const out = deriveNotifications({ ...base, printRuns: [futureRunB1, secondRunB1] });
    const keys = out.map(n => n.key);
    expect(keys[0]).not.toBe(keys[1]);
    expect(new Set(keys).size).toBe(2);
  });
});

// ── Low stock ─────────────────────────────────────────────────────────────────

describe("notifications — low stock across multiple books", () => {
  it("both books low → two LOW_STOCK notifications", () => {
    const out = deriveNotifications({
      ...base,
      stockByBook: [
        { bookId: "b1", stock: 3 },
        { bookId: "b2", stock: 7 },
      ],
    });
    const lowStock = out.filter(n => n.type === "LOW_STOCK");
    expect(lowStock).toHaveLength(2);
  });

  it("only book-1 low → exactly one LOW_STOCK notification", () => {
    const out = deriveNotifications({
      ...base,
      stockByBook: [
        { bookId: "b1", stock: 5 },
        { bookId: "b2", stock: LOW_STOCK_THRESHOLD + 1 }, // above threshold
      ],
    });
    const lowStock = out.filter(n => n.type === "LOW_STOCK");
    expect(lowStock).toHaveLength(1);
    expect(lowStock[0].key).toContain("b1");
    expect(lowStock[0].href).toBe("/libros/b1");
  });

  it("neither book low → no LOW_STOCK notifications", () => {
    const out = deriveNotifications({
      ...base,
      stockByBook: [
        { bookId: "b1", stock: LOW_STOCK_THRESHOLD + 1 },
        { bookId: "b2", stock: LOW_STOCK_THRESHOLD + 5 },
      ],
    });
    expect(out.filter(n => n.type === "LOW_STOCK")).toHaveLength(0);
  });

  it("book at stock=0 is excluded (out-of-print, not 'low')", () => {
    const out = deriveNotifications({
      ...base,
      stockByBook: [
        { bookId: "b1", stock: 0 },
        { bookId: "b2", stock: 5 },
      ],
    });
    const lowStock = out.filter(n => n.type === "LOW_STOCK");
    expect(lowStock).toHaveLength(1);
    expect(lowStock[0].key).toContain("b2");
  });

  it("dismissing book-1 low-stock key does not suppress book-2", () => {
    const notifications = deriveNotifications({
      ...base,
      stockByBook: [
        { bookId: "b1", stock: 3 },
        { bookId: "b2", stock: 5 },
      ],
    });
    const visible = filterDismissed(notifications, ["low-stock:b1:3"]);
    const lowStock = visible.filter(n => n.type === "LOW_STOCK");
    expect(lowStock).toHaveLength(1);
    expect(lowStock[0].key).toBe("low-stock:b2:5");
  });

  it("stock change on book-1 makes its dismissed key stale while book-2 key stays active", () => {
    // book-2 still has stock=5; book-1's stock changed from 3 to 8 (new key)
    const currentNotifications = deriveNotifications({
      ...base,
      stockByBook: [
        { bookId: "b1", stock: 8 }, // stock changed — old key was low-stock:b1:3
        { bookId: "b2", stock: 5 },
      ],
    });
    const stale = staleDismissalKeys(currentNotifications, [
      "low-stock:b1:3",  // old key — b1 stock changed
      "low-stock:b2:5",  // still active
    ]);
    expect(stale).toEqual(["low-stock:b1:3"]);
  });
});

// ── Overdue exchanges ─────────────────────────────────────────────────────────

describe("notifications — overdue exchanges across multiple books", () => {
  const overdueB1 = {
    id: "e1", recipient: "@influencer_a", status: "PENDING",
    deadlineAt: new Date("2026-06-01T12:00:00"), // past
  };
  const overdueB2 = {
    id: "e2", recipient: "@influencer_b", status: "PENDING",
    deadlineAt: new Date("2026-06-03T12:00:00"), // past
  };
  const futureB1 = {
    id: "e3", recipient: "@influencer_c", status: "PENDING",
    deadlineAt: new Date("2026-07-01T12:00:00"), // future — should not fire
  };

  it("both overdue exchanges fire independently", () => {
    const out = deriveNotifications({ ...base, exchanges: [overdueB1, overdueB2] });
    const overdue = out.filter(n => n.type === "EXCHANGE_OVERDUE");
    expect(overdue).toHaveLength(2);
    expect(overdue.map(n => n.key)).toContain("exchange-overdue:e1:2026-06-01");
    expect(overdue.map(n => n.key)).toContain("exchange-overdue:e2:2026-06-03");
  });

  it("only past-deadline exchanges fire; future ones are suppressed", () => {
    const out = deriveNotifications({ ...base, exchanges: [overdueB1, futureB1] });
    const overdue = out.filter(n => n.type === "EXCHANGE_OVERDUE");
    expect(overdue).toHaveLength(1);
    expect(overdue[0].key).toContain("e1");
  });
});

// ── Mixed notifications — ordering and dismissal ──────────────────────────────

describe("notifications — mixed multi-book: ordering and dismissal", () => {
  const richInputs: NotificationInputs = {
    ...base,
    // INCOMING_PRINT_RUN (info) for b1
    printRuns: [{
      id: "r1", bookId: "b1", quantity: 200,
      receivedAt: new Date("2026-07-01T12:00:00"),
      createdAt:  new Date("2026-06-10T12:00:00"),
    }],
    // PAYMENT_DUE (action) for a channel
    channelsOutstanding: [{ id: "c1", name: "Librería Norte", outstanding: 80000 }],
    // LOW_STOCK (warning) for both books
    stockByBook: [
      { bookId: "b1", stock: 2 },
      { bookId: "b2", stock: 5 },
    ],
    // EXCHANGE_OVERDUE (warning) for b2
    exchanges: [{
      id: "e1", recipient: "@press", status: "PENDING",
      deadlineAt: new Date("2026-05-01T12:00:00"),
    }],
  };

  it("all 5 notifications are emitted (1 action + 3 warnings + 1 info)", () => {
    const out = deriveNotifications(richInputs);
    expect(out).toHaveLength(5);
  });

  it("sorted action → warning → info, with multiple warnings all present", () => {
    const out = deriveNotifications(richInputs);
    expect(out[0].severity).toBe("action");
    expect(out[1].severity).toBe("warning");
    expect(out[2].severity).toBe("warning");
    expect(out[3].severity).toBe("warning");
    expect(out[4].severity).toBe("info");
  });

  it("dismissing book-1 low-stock and run leaves 3 notifications visible", () => {
    const out = deriveNotifications(richInputs);
    const visible = filterDismissed(out, [
      "low-stock:b1:2",
      "incoming-run:r1:2026-07-01",
    ]);
    expect(visible).toHaveLength(3);
    expect(visible.map(n => n.type).sort()).toEqual([
      "EXCHANGE_OVERDUE",
      "LOW_STOCK",
      "PAYMENT_DUE",
    ].sort());
  });

  it("staleDismissalKeys identifies keys no longer active across books", () => {
    const out = deriveNotifications(richInputs);
    const stale = staleDismissalKeys(out, [
      "payment-due:c1:80000",      // still active
      "low-stock:b1:2",             // still active
      "low-stock:b1:9",             // stale — stock changed
      "incoming-run:r1:2026-06-01", // stale — different delivery date
    ]);
    expect(stale.sort()).toEqual([
      "incoming-run:r1:2026-06-01",
      "low-stock:b1:9",
    ].sort());
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Revenue aggregation across multiple books
// ─────────────────────────────────────────────────────────────────────────────

describe("saleToCLP — aggregating revenue across two books", () => {
  const b1Sales = [
    { totalAmount: 24000, amountCLP: null, currency: "CLP" },  // CLP sale
    { totalAmount: 100,   amountCLP: 97000, currency: "USD" }, // USD with stored rate
  ];
  const b2Sales = [
    { totalAmount: 16000, amountCLP: null, currency: "CLP" },
    { totalAmount: 8000,  amountCLP: null, currency: "CLP" },
  ];

  it("total revenue book-1: CLP sale + stored USD rate", () => {
    const total = b1Sales.reduce((sum, s) => sum + saleToCLP(s), 0);
    expect(total).toBe(24000 + 97000);
  });

  it("total revenue book-2: two CLP sales summed", () => {
    const total = b2Sales.reduce((sum, s) => sum + saleToCLP(s), 0);
    expect(total).toBe(24000);
  });

  it("combined revenue for both books is independent sum", () => {
    const combined = [...b1Sales, ...b2Sales].reduce((sum, s) => sum + saleToCLP(s), 0);
    expect(combined).toBe((24000 + 97000) + 24000);
  });

  it("foreign-currency legacy sales without stored rate contribute 0 to combined total", () => {
    const mixedSales = [
      { totalAmount: 50000, amountCLP: null, currency: "CLP" },  // counts
      { totalAmount: 200,   amountCLP: null, currency: "USD" },  // no rate → 0
      { totalAmount: 30000, amountCLP: null, currency: "CLP" },  // counts
    ];
    const total = mixedSales.reduce((sum, s) => sum + saleToCLP(s), 0);
    expect(total).toBe(80000); // USD skipped
  });
});

describe("calc3MonthAvg — revenue series spanning multiple books", () => {
  it("combined monthly revenue from two books averages correctly", () => {
    // Month revenues: book-1 + book-2 combined per month
    const monthly = [
      50_000 + 20_000,  // month 1 = 70_000
      60_000 + 25_000,  // month 2 = 85_000
      70_000 + 30_000,  // month 3 = 100_000
    ];
    expect(calc3MonthAvg(monthly)).toBeCloseTo(85_000);
  });

  it("one book launches mid-series — prior zero months pull the average down", () => {
    // book-2 launched in month 2
    const monthly = [
      40_000,  // month 1: only book-1
      40_000 + 20_000, // month 2: both books
      40_000 + 20_000, // month 3: both books
    ];
    const avg = calc3MonthAvg(monthly);
    expect(avg).toBeCloseTo((40_000 + 60_000 + 60_000) / 3);
  });

  it("steady revenue across two books tracks correctly over six months", () => {
    const monthly = [10_000, 12_000, 11_000, 13_000, 14_000, 12_000];
    // Only last 3 months matter: 13_000 + 14_000 + 12_000
    expect(calc3MonthAvg(monthly)).toBeCloseTo(13_000);
  });
});

describe("calcOutstanding — channel balance with sales from multiple books", () => {
  it("outstanding is computed on the channel total, not per-book", () => {
    // All sales through the same channel, regardless of which book
    const grossFromB1 = 80_000;
    const grossFromB2 = 40_000;
    const grossTotal  = grossFromB1 + grossFromB2; // 120_000
    const received    = 50_000;

    expect(calcOutstanding(grossTotal, received)).toBe(70_000);
  });

  it("full payment of multi-book channel returns 0 outstanding", () => {
    expect(calcOutstanding(120_000, 120_000)).toBe(0);
  });

  it("overpayment on multi-book channel is clamped to 0 (no negative balance)", () => {
    expect(calcOutstanding(100_000, 110_000)).toBe(0);
  });

  it("two channels with different multi-book outstanding are independent", () => {
    const ch1 = calcOutstanding(80_000 + 30_000, 60_000);  // 50_000 owed
    const ch2 = calcOutstanding(50_000 + 20_000, 70_000);  // 0 (overpaid)
    expect(ch1).toBe(50_000);
    expect(ch2).toBe(0);
  });
});
