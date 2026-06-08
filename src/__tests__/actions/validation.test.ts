/**
 * Action-level validation tests.
 * Prisma is mocked — these tests cover input guards and error propagation
 * without requiring a real database.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Prisma mock (hoisted so variables are ready before vi.mock runs) ──────────

const {
  mockSaleCreate, mockSaleUpdate, mockSaleFindFirst, mockSaleDelete,
  mockMovementCreate, mockChannelFindFirst, mockBookFindFirst,
  mockExpenseCreate, mockExpenseUpdate, mockExpenseDelete, mockExpenseFindFirst,
} = vi.hoisted(() => ({
  mockSaleCreate:       vi.fn(),
  mockSaleUpdate:       vi.fn(),
  mockSaleFindFirst:    vi.fn(),
  mockSaleDelete:       vi.fn(),
  mockMovementCreate:   vi.fn(),
  mockChannelFindFirst: vi.fn(),
  mockBookFindFirst:    vi.fn(),
  mockExpenseCreate:    vi.fn(),
  mockExpenseUpdate:    vi.fn(),
  mockExpenseDelete:    vi.fn(),
  mockExpenseFindFirst: vi.fn(),
}));

// Mock the auth helper so tests don't need a real Supabase/Next.js context
vi.mock("@/lib/auth", () => ({
  requireAccount: vi.fn().mockResolvedValue({ account: { id: "acc1" } }),
}));

// Mock Next.js cache so updateTag doesn't throw outside a server action context
vi.mock("next/cache", () => ({
  updateTag: vi.fn(),
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
  unstable_cache: vi.fn((fn: () => unknown) => fn),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    sale: {
      create:     mockSaleCreate,
      update:     mockSaleUpdate,
      delete:     mockSaleDelete,
      findFirst:  mockSaleFindFirst,
    },
    channel:           { findFirst: mockChannelFindFirst, findUnique: mockChannelFindFirst },
    book:              { findFirst: mockBookFindFirst, findUnique: mockBookFindFirst },
    inventoryMovement: { create: mockMovementCreate },
    expense: {
      create:    mockExpenseCreate,
      update:    mockExpenseUpdate,
      delete:    mockExpenseDelete,
      findFirst: mockExpenseFindFirst,
    },
    $transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        sale:              { create: mockSaleCreate },
        inventoryMovement: { create: mockMovementCreate },
      }),
    ),
  },
}));

import { createSale, updateSale, deleteSale } from "@/actions/sales";
import { createExpense, updateExpense, deleteExpense } from "@/actions/expenses";

// ── Sales — createSale ────────────────────────────────────────────────────────

describe("createSale — input validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChannelFindFirst.mockResolvedValue({ id: "c1", type: "DIRECT" });
    mockBookFindFirst.mockResolvedValue({ id: "b1", formats: ["PRINT"] });
    mockSaleCreate.mockResolvedValue({});
    mockMovementCreate.mockResolvedValue({});
  });

  it("rejects quantity < 1", async () => {
    const result = await createSale({
      bookId: "b1", channelId: "c1", quantity: 0, unitPrice: 8000, currency: "CLP",
    });
    expect(result.error).toBe("La cantidad debe ser al menos 1.");
    expect(mockSaleCreate).not.toHaveBeenCalled();
  });

  it("rejects negative quantity", async () => {
    const result = await createSale({
      bookId: "b1", channelId: "c1", quantity: -5, unitPrice: 8000, currency: "CLP",
    });
    expect(result.error).toBe("La cantidad debe ser al menos 1.");
  });

  it("rejects negative unit price", async () => {
    const result = await createSale({
      bookId: "b1", channelId: "c1", quantity: 1, unitPrice: -1, currency: "CLP",
    });
    expect(result.error).toBe("El precio no puede ser negativo.");
    expect(mockSaleCreate).not.toHaveBeenCalled();
  });

  it("allows unit price of 0 (free item)", async () => {
    const result = await createSale({
      bookId: "b1", channelId: "c1", quantity: 1, unitPrice: 0, currency: "CLP",
    });
    expect(result.error).toBeUndefined();
  });

  it("returns {} on success for a CLP sale", async () => {
    const result = await createSale({
      bookId: "b1", channelId: "c1", quantity: 2, unitPrice: 8000, currency: "CLP",
    });
    expect(result).toEqual({});
    expect(mockSaleCreate).toHaveBeenCalledOnce();
  });

  it("stores amountCLP = total when currency is CLP and no fxRate provided", async () => {
    await createSale({
      bookId: "b1", channelId: "c1", quantity: 2, unitPrice: 8000, currency: "CLP",
    });
    const call = mockSaleCreate.mock.calls[0][0].data;
    expect(call.amountCLP).toBe("16000.00");
  });

  it("stores amountCLP = total × fxRate for a foreign-currency sale with rate", async () => {
    await createSale({
      bookId: "b1", channelId: "c1", quantity: 1, unitPrice: 100, currency: "USD",
      fxRateToCLP: 970,
    });
    const call = mockSaleCreate.mock.calls[0][0].data;
    expect(call.amountCLP).toBe("97000.00");
    expect(call.fxRateToCLP).toBe("970.000000");
  });

  it("stores amountCLP = null when foreign currency has no rate", async () => {
    await createSale({
      bookId: "b1", channelId: "c1", quantity: 1, unitPrice: 100, currency: "USD",
    });
    const call = mockSaleCreate.mock.calls[0][0].data;
    expect(call.amountCLP).toBeNull();
  });

  it("creates an inventory movement for DIRECT + PRINT", async () => {
    mockChannelFindFirst.mockResolvedValue({ id: "c1", type: "DIRECT" });
    mockBookFindFirst.mockResolvedValue({ id: "b1", formats: ["PRINT"] });

    await createSale({
      bookId: "b1", channelId: "c1", quantity: 1, unitPrice: 8000, currency: "CLP",
    });
    expect(mockMovementCreate).toHaveBeenCalledOnce();
  });

  it("does NOT create an inventory movement for DIGITAL channels", async () => {
    mockChannelFindFirst.mockResolvedValue({ id: "c1", type: "DIGITAL" });
    mockBookFindFirst.mockResolvedValue({ id: "b1", formats: ["EBOOK"] });

    await createSale({
      bookId: "b1", channelId: "c1", quantity: 1, unitPrice: 5000, currency: "CLP",
    });
    expect(mockMovementCreate).not.toHaveBeenCalled();
  });

  it("returns error string when Prisma throws", async () => {
    mockSaleCreate.mockRejectedValueOnce(new Error("DB error"));
    const result = await createSale({
      bookId: "b1", channelId: "c1", quantity: 1, unitPrice: 8000, currency: "CLP",
    });
    expect(result.error).toMatch(/error/i);
  });
});

// ── Sales — updateSale ────────────────────────────────────────────────────────

describe("updateSale — input validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSaleFindFirst.mockResolvedValue({ id: "s1", currency: "CLP" });
    mockSaleUpdate.mockResolvedValue({});
  });

  it("rejects quantity < 1", async () => {
    const result = await updateSale({
      id: "s1", quantity: 0, unitPrice: 8000, channelId: "c1",
      saleDate: "2025-06-15", status: "CONFIRMED",
    });
    expect(result.error).toBe("La cantidad debe ser al menos 1.");
    expect(mockSaleUpdate).not.toHaveBeenCalled();
  });

  it("rejects negative unit price", async () => {
    const result = await updateSale({
      id: "s1", quantity: 1, unitPrice: -1, channelId: "c1",
      saleDate: "2025-06-15", status: "CONFIRMED",
    });
    expect(result.error).toBe("El precio no puede ser negativo.");
    expect(mockSaleUpdate).not.toHaveBeenCalled();
  });

  it("returns {} on success", async () => {
    const result = await updateSale({
      id: "s1", quantity: 2, unitPrice: 8000, channelId: "c1",
      saleDate: "2025-06-15", status: "CONFIRMED",
    });
    expect(result).toEqual({});
    expect(mockSaleUpdate).toHaveBeenCalledOnce();
  });

  it("recalculates amountCLP when fxRate is provided", async () => {
    mockSaleFindFirst.mockResolvedValue({ id: "s1", currency: "USD" });
    await updateSale({
      id: "s1", quantity: 1, unitPrice: 100, channelId: "c1",
      saleDate: "2025-06-15", status: "CONFIRMED", fxRateToCLP: 970,
    });
    const call = mockSaleUpdate.mock.calls[0][0].data;
    expect(call.amountCLP).toBe("97000.00");
  });

  it("returns error string when Prisma throws", async () => {
    mockSaleUpdate.mockRejectedValueOnce(new Error("DB error"));
    const result = await updateSale({
      id: "s1", quantity: 1, unitPrice: 8000, channelId: "c1",
      saleDate: "2025-06-15", status: "CONFIRMED",
    });
    expect(result.error).toMatch(/error/i);
  });
});

// ── Sales — deleteSale ────────────────────────────────────────────────────────

describe("deleteSale", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSaleFindFirst.mockResolvedValue({ id: "s1" });
    mockSaleDelete.mockResolvedValue({});
  });

  it("returns {} on success", async () => {
    expect(await deleteSale("s1")).toEqual({});
    expect(mockSaleDelete).toHaveBeenCalledWith({ where: { id: "s1" } });
  });

  it("returns error string when Prisma throws", async () => {
    mockSaleDelete.mockRejectedValueOnce(new Error("DB error"));
    const result = await deleteSale("s1");
    expect(result.error).toMatch(/error/i);
  });
});

// ── Expenses — createExpense ──────────────────────────────────────────────────

describe("createExpense — input validation", () => {
  const valid = {
    accountId: "acc1",
    description: "Diseño de portada",
    amount: 50000,
    currency: "CLP",
    category: "DESIGN_ART" as const,
    level: "BOOK" as const,
    bookId: "b1",
    occurredAt: "2025-06-15",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockExpenseCreate.mockResolvedValue({});
  });

  it("rejects empty description", async () => {
    const result = await createExpense({ ...valid, description: "" });
    expect(result.error).toBe("La descripción es obligatoria.");
    expect(mockExpenseCreate).not.toHaveBeenCalled();
  });

  it("rejects whitespace-only description", async () => {
    const result = await createExpense({ ...valid, description: "   " });
    expect(result.error).toBe("La descripción es obligatoria.");
    expect(mockExpenseCreate).not.toHaveBeenCalled();
  });

  it("rejects amount of 0", async () => {
    const result = await createExpense({ ...valid, amount: 0 });
    expect(result.error).toBe("El monto debe ser mayor a 0.");
    expect(mockExpenseCreate).not.toHaveBeenCalled();
  });

  it("rejects negative amount", async () => {
    const result = await createExpense({ ...valid, amount: -500 });
    expect(result.error).toBe("El monto debe ser mayor a 0.");
    expect(mockExpenseCreate).not.toHaveBeenCalled();
  });

  it("trims leading/trailing whitespace from description before saving", async () => {
    await createExpense({ ...valid, description: "  Diseño  " });
    const call = mockExpenseCreate.mock.calls[0][0].data;
    expect(call.description).toBe("Diseño");
  });

  it("returns {} on success", async () => {
    expect(await createExpense(valid)).toEqual({});
    expect(mockExpenseCreate).toHaveBeenCalledOnce();
  });

  it("resolves bookId to null for GENERAL level regardless of input", async () => {
    await createExpense({ ...valid, level: "GENERAL", bookId: "b1" });
    const call = mockExpenseCreate.mock.calls[0][0].data;
    expect(call.bookId).toBeNull();
  });

  it("stores bookId for BOOK level", async () => {
    await createExpense({ ...valid, level: "BOOK", bookId: "b1" });
    const call = mockExpenseCreate.mock.calls[0][0].data;
    expect(call.bookId).toBe("b1");
    expect(call.printRunId).toBeNull();
  });

  it("returns error string when Prisma throws", async () => {
    mockExpenseCreate.mockRejectedValueOnce(new Error("DB error"));
    const result = await createExpense(valid);
    expect(result.error).toMatch(/error/i);
  });
});

// ── Expenses — updateExpense ──────────────────────────────────────────────────

describe("updateExpense — input validation", () => {
  const valid = {
    id: "e1",
    description: "Diseño de portada",
    amount: 50000,
    currency: "CLP",
    category: "DESIGN_ART" as const,
    level: "GENERAL" as const,
    occurredAt: "2025-06-15",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockExpenseFindFirst.mockResolvedValue({ id: "e1" });
    mockExpenseUpdate.mockResolvedValue({});
  });

  it("rejects empty description", async () => {
    const result = await updateExpense({ ...valid, description: "" });
    expect(result.error).toBe("La descripción es obligatoria.");
    expect(mockExpenseUpdate).not.toHaveBeenCalled();
  });

  it("rejects amount of 0", async () => {
    const result = await updateExpense({ ...valid, amount: 0 });
    expect(result.error).toBe("El monto debe ser mayor a 0.");
  });

  it("rejects negative amount", async () => {
    const result = await updateExpense({ ...valid, amount: -1 });
    expect(result.error).toBe("El monto debe ser mayor a 0.");
  });

  it("returns {} on success", async () => {
    expect(await updateExpense(valid)).toEqual({});
    expect(mockExpenseUpdate).toHaveBeenCalledOnce();
  });

  it("returns error string when Prisma throws", async () => {
    mockExpenseUpdate.mockRejectedValueOnce(new Error("DB error"));
    const result = await updateExpense(valid);
    expect(result.error).toMatch(/error/i);
  });
});

// ── Expenses — deleteExpense ──────────────────────────────────────────────────

describe("deleteExpense", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExpenseFindFirst.mockResolvedValue({ id: "e1" });
    mockExpenseDelete.mockResolvedValue({});
  });

  it("returns {} on success", async () => {
    expect(await deleteExpense("e1")).toEqual({});
    expect(mockExpenseDelete).toHaveBeenCalledWith({ where: { id: "e1" } });
  });

  it("returns error string when Prisma throws", async () => {
    mockExpenseDelete.mockRejectedValueOnce(new Error("DB error"));
    const result = await deleteExpense("e1");
    expect(result.error).toMatch(/error/i);
  });
});
