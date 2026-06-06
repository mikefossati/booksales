/**
 * Pure business-logic functions with no I/O dependencies.
 * All monetary inputs/outputs are plain numbers (convert Decimal → number before calling).
 */

import { toNum } from "./format";

// ── Local type aliases (match Prisma enums, no Prisma import needed) ─────────

export type ChannelType    = "DIGITAL" | "BOOKSTORE" | "DIRECT" | "PRESALE";
export type ExpenseLevel   = "GENERAL" | "BOOK" | "PRINT_RUN";
export type ExchangeStatus = "PENDING" | "FULFILLED" | "UNFULFILLED";
export type MovementType   =
  | "NEW_PRINT_RUN"
  | "SEND_TO_BOOKSTORE"
  | "DIRECT_SALE"
  | "BOOKSTORE_RETURN"
  | "SEND_TO_INFLUENCER"
  | "WRITEOFF"
  | "BUNDLE_ASSEMBLY"
  | "MERCHANDISE_ENTRY"
  | "MERCHANDISE_SALE"
  | "MERCHANDISE_WRITEOFF";

// ── Sale & cost calculations ──────────────────────────────────────────────────

/** Gross sale total — quantity × unit price. */
export function calcSaleTotal(quantity: number, unitPrice: number): number {
  return quantity * unitPrice;
}

/**
 * Cost per unit — totalCost ÷ quantity.
 * Returns 0 when quantity is 0 to guard against division by zero.
 */
export function calcCostPerUnit(totalCost: number, quantity: number): number {
  return quantity > 0 ? totalCost / quantity : 0;
}

// ── Channel revenue (net of platform commissions) ─────────────────────────────

/**
 * Net amount the author receives from a gross sale amount, given the channel type.
 * - DIGITAL: gross × (royaltyPct / 100)  — platform keeps the rest
 * - BOOKSTORE: gross × ((100 − consignmentPct) / 100)  — librería takes consignmentPct
 * - DIRECT / PRESALE / no applicable %: full gross amount
 */
export function netChannelRevenue(
  grossAmount: number,
  channelType: ChannelType,
  royaltyPct: number | null,
  consignmentPct: number | null,
): number {
  if (channelType === "DIGITAL" && royaltyPct != null) {
    return grossAmount * (royaltyPct / 100);
  }
  if (channelType === "BOOKSTORE" && consignmentPct != null) {
    return grossAmount * ((100 - consignmentPct) / 100);
  }
  return grossAmount;
}

// ── Print-run investment recovery ─────────────────────────────────────────────

/**
 * What percentage of the print-run cost has been recovered through sales.
 * Capped at 100 — never exceeds full recovery even if revenue > cost.
 * Returns 0 when cost is 0 (no investment to recover).
 */
export function calcRecoveryPct(revenue: number, cost: number): number {
  if (cost <= 0) return 0;
  return Math.min((revenue / cost) * 100, 100);
}

/**
 * True when the full print-run investment has been recovered.
 * Requires cost > 0 and revenue ≥ cost.
 */
export function isFullyRecovered(revenue: number, cost: number): boolean {
  return cost > 0 && revenue >= cost;
}

// ── Month-over-month growth ───────────────────────────────────────────────────

/**
 * Percentage change from previous to current period.
 * - If previous = 0 and current > 0: returns 100 (new revenue, treat as 100% growth).
 * - If both are 0: returns 0.
 */
export function calcMomPercent(current: number, previous: number): number {
  if (previous > 0) return ((current - previous) / previous) * 100;
  return current > 0 ? 100 : 0;
}

// ── Book inventory from movement log ─────────────────────────────────────────

export interface InventoryMovement {
  type: string;
  quantity: number;
}

/** Signed impact on "stock in hand" for each movement type. */
export const STOCK_SIGN: Record<string, number> = {
  NEW_PRINT_RUN:      +1,
  BOOKSTORE_RETURN:   +1,
  SEND_TO_BOOKSTORE:  -1,
  DIRECT_SALE:        -1,
  SEND_TO_INFLUENCER: -1,
  WRITEOFF:           -1,
  BUNDLE_ASSEMBLY:    -1,
};

/**
 * Units currently in the author's hands — net of all outgoing/incoming movements.
 * Unknown movement types contribute 0.
 */
export function calcStockInHand(movements: InventoryMovement[]): number {
  return movements.reduce(
    (total, m) => total + (STOCK_SIGN[m.type] ?? 0) * m.quantity,
    0,
  );
}

/**
 * Units currently held in bookstores on consignment.
 * = Σ SEND_TO_BOOKSTORE − Σ BOOKSTORE_RETURN
 */
export function calcInBookstores(movements: InventoryMovement[]): number {
  return movements.reduce((total, m) => {
    if (m.type === "SEND_TO_BOOKSTORE") return total + m.quantity;
    if (m.type === "BOOKSTORE_RETURN")  return total - m.quantity;
    return total;
  }, 0);
}

/**
 * Units sent to influencers / collaborators (canjes).
 * = Σ SEND_TO_INFLUENCER (never returned, so no subtraction).
 */
export function calcInExchanges(movements: InventoryMovement[]): number {
  return movements.reduce(
    (total, m) => (m.type === "SEND_TO_INFLUENCER" ? total + m.quantity : total),
    0,
  );
}

// ── Merchandise inventory ─────────────────────────────────────────────────────

/**
 * Units of merch currently in stock.
 * = Σ productionBatches.quantity − Σ sold.quantity
 */
export function calcMerchStock(
  batchedQty: number,
  soldQty: number,
): number {
  return batchedQty - soldQty;
}

// ── Exchange / canje display status ───────────────────────────────────────────

export interface ExchangeStatusMeta {
  dot: string;
  label: string;
  labelColor: string;
}

/**
 * Visual status for a canje:
 * - FULFILLED → green ✅
 * - UNFULFILLED → red 🔴
 * - PENDING + deadline passed → red 🔴 (overdue)
 * - PENDING + deadline in future, or no deadline → yellow 🟡
 */
export function getExchangeStatusMeta(
  status: ExchangeStatus,
  deadlineAt: Date | null,
  now: Date = new Date(),
): ExchangeStatusMeta {
  if (status === "FULFILLED") {
    return { dot: "🟢", label: "Cumplido",    labelColor: "text-[var(--color-success)]" };
  }
  if (status === "UNFULFILLED") {
    return { dot: "🔴", label: "No cumplido", labelColor: "text-[var(--color-danger)]"  };
  }
  // PENDING
  if (deadlineAt !== null && deadlineAt < now) {
    return { dot: "🔴", label: "Vencido",     labelColor: "text-[var(--color-danger)]"  };
  }
  return   { dot: "🟡", label: "Pendiente",   labelColor: "text-[var(--color-warning)]" };
}

// ── Income projections ────────────────────────────────────────────────────────

export interface ProjectionScenarios {
  conservador: number; // −20%
  realista:    number; // baseline
  optimista:   number; // +20%
}

/**
 * Three-scenario monthly projection based on a baseline average.
 * All values rounded to nearest integer.
 */
export function calcProjectionScenarios(avg3Month: number): ProjectionScenarios {
  return {
    conservador: Math.round(avg3Month * 0.8),
    realista:    Math.round(avg3Month),
    optimista:   Math.round(avg3Month * 1.2),
  };
}

/**
 * Average of the last 3 values in a monthly revenue series.
 * If fewer than 3 elements, averages all available.
 * Returns 0 for an empty series.
 */
export function calc3MonthAvg(series: number[]): number {
  if (series.length === 0) return 0;
  const tail = series.slice(-3);
  return tail.reduce((s, n) => s + n, 0) / tail.length;
}

// ── Multi-currency conversion ─────────────────────────────────────────────────

/**
 * Returns the CLP-equivalent of a sale amount.
 * - If amountCLP is stored (post-migration), use it directly.
 * - Fallback: if the sale currency is already CLP, return the raw amount.
 * - Otherwise returns 0 (foreign-currency legacy record with no rate stored).
 */
export function toBaseCurrency(
  amount:     number,
  amountCLP:  number | null,
  currency:   string,
): number {
  if (amountCLP !== null) return amountCLP;
  if (currency === "CLP")  return amount;
  return 0;
}

/**
 * Convenience wrapper for Sale objects: extracts the CLP-equivalent amount.
 * Uses the stored amountCLP when present; falls back to totalAmount for CLP
 * sales; returns 0 for foreign-currency sales with no rate recorded.
 */
export function saleToCLP(sale: {
  totalAmount: unknown;
  amountCLP?:  unknown;
  currency:    string;
}): number {
  if (sale.amountCLP != null) return toNum(sale.amountCLP);
  return sale.currency === "CLP" ? toNum(sale.totalAmount) : 0;
}

// ── Payments / outstanding balance ───────────────────────────────────────────

/**
 * Amount still owed to the author from a channel.
 * Floors at 0 — a channel that has over-paid doesn't create a negative balance.
 */
export function calcOutstanding(grossEarned: number, received: number): number {
  return Math.max(0, grossEarned - received);
}

// ── Expense bookkeeping rules ─────────────────────────────────────────────────

export interface ExpenseAssignments {
  bookId:     string | null;
  printRunId: string | null;
}

/**
 * Determines which optional IDs to store on an Expense based on its level.
 * - GENERAL: neither book nor print run
 * - BOOK: book only (printRunId always null)
 * - PRINT_RUN: both book and print run (if provided)
 */
export function resolveExpenseAssignments(
  level: ExpenseLevel,
  bookId?:     string,
  printRunId?: string,
): ExpenseAssignments {
  if (level === "GENERAL") {
    return { bookId: null, printRunId: null };
  }
  if (level === "BOOK") {
    return { bookId: bookId ?? null, printRunId: null };
  }
  // PRINT_RUN
  return {
    bookId:     bookId     ?? null,
    printRunId: printRunId ?? null,
  };
}

// ── Inventory tracking eligibility ───────────────────────────────────────────

/**
 * Whether a book sale should auto-create an inventory movement.
 * Only direct sales of physical books are tracked:
 * - Channel must be DIRECT (not DIGITAL, BOOKSTORE, or PRESALE)
 * - Book must include "PRINT" format
 */
export function shouldTrackBookInventory(
  channelType: string,
  bookFormats:  string[],
): boolean {
  return channelType === "DIRECT" && bookFormats.includes("PRINT");
}
