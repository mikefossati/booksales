import { describe, it, expect } from "vitest";
import {
  buildCsv,
  buildXlsx,
  salesAoa,
  expensesAoa,
  bookStockAoa,
  consignmentAoa,
  exchangesAoa,
  printRunPnlAoa,
  merchPnlAoa,
  projectionsAoa,
  type SaleRecord,
  type BookStockRecord,
  type ConsignmentRecord,
  type ExchangeRecord,
  type PrintRunPnlRecord,
  type MerchPnlRecord,
  type ProjectionRecord,
  type ExpenseRecord,
} from "@/lib/export";

// ── buildCsv ──────────────────────────────────────────────────────────────────

describe("buildCsv", () => {
  it("starts with a UTF-8 BOM (0xFEFF)", () => {
    const csv = buildCsv([["A"]]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("produces correct header and data rows", () => {
    const csv = buildCsv([
      ["Fecha", "Total"],
      ["15/06/2025", 8000],
    ]);
    expect(csv).toContain("Fecha,Total");
    expect(csv).toContain("15/06/2025,8000");
  });

  it("uses CRLF line endings", () => {
    const csv = buildCsv([["h"], ["v1"], ["v2"]]);
    const withoutBom = csv.slice(1);
    expect(withoutBom).toContain("\r\n");
    expect(withoutBom).not.toMatch(/(?<!\r)\n/); // no bare LF
  });

  it("quotes values that contain commas", () => {
    const csv = buildCsv([["Libro, edición especial"]]);
    expect(csv).toContain('"Libro, edición especial"');
  });

  it("escapes embedded double-quotes by doubling them", () => {
    const csv = buildCsv([[`She said "hola"`]]);
    expect(csv).toContain('"She said ""hola"""');
  });

  it("quotes values that contain newlines", () => {
    const csv = buildCsv([["line1\nline2"]]);
    expect(csv).toContain('"line1\nline2"');
  });

  it("renders null as an empty field", () => {
    const csv = buildCsv([["A", null, "B"]]);
    const firstLine = csv.split("\r\n")[0].replace(/^﻿/, "");
    expect(firstLine).toBe("A,,B");
  });

  it("plain strings without special characters are not quoted", () => {
    const csv = buildCsv([["SimpleText"]]);
    expect(csv).not.toContain('"SimpleText"');
  });

  it("handles numbers as-is (no quoting)", () => {
    const csv = buildCsv([[12345]]);
    expect(csv).toContain("12345");
    expect(csv).not.toContain('"12345"');
  });

  it("returns only BOM for empty input", () => {
    expect(buildCsv([])).toBe("﻿");
  });
});

// ── buildXlsx ─────────────────────────────────────────────────────────────────

describe("buildXlsx", () => {
  it("returns a Buffer", () => {
    const buf = buildXlsx([{ name: "Ventas", aoa: [["A", "B"], [1, 2]] }]);
    expect(Buffer.isBuffer(buf)).toBe(true);
  });

  it("returns a non-empty buffer", () => {
    const buf = buildXlsx([{ name: "Hoja1", aoa: [["x"]] }]);
    expect(buf.length).toBeGreaterThan(0);
  });

  it("handles multiple sheets without throwing", () => {
    const buf = buildXlsx([
      { name: "Ventas",      aoa: [["Fecha", "Total"], ["01/06/2025", 1000]] },
      { name: "Gastos",      aoa: [["Fecha", "Monto"], ["02/06/2025", 500]] },
      { name: "Proyecciones", aoa: [["Mes", "Realista"]] },
    ]);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(0);
  });

  it("handles an empty AOA (header-only sheet)", () => {
    const buf = buildXlsx([{ name: "Vacío", aoa: [] }]);
    expect(Buffer.isBuffer(buf)).toBe(true);
  });
});

// ── salesAoa ──────────────────────────────────────────────────────────────────

describe("salesAoa", () => {
  const row: SaleRecord = {
    saleDate: "15/06/2025",
    item: "Mi libro",
    channelName: "Amazon KDP",
    channelType: "Digital",
    quantity: 2,
    unitPrice: 8000,
    currency: "CLP",
    totalAmount: 16000,
    amountCLP: 16000,
    paymentMethod: "transferencia",
    status: "Confirmada",
  };

  it("returns correct Spanish column headers", () => {
    expect(salesAoa([row])[0]).toEqual([
      "Fecha", "Libro / Producto", "Canal", "Tipo canal", "Unidades",
      "Precio unit.", "Moneda", "Total (moneda)", "Total CLP", "Pago", "Estado",
    ]);
  });

  it("maps each field to the right column position", () => {
    const data = salesAoa([row])[1];
    expect(data).toEqual([
      "15/06/2025", "Mi libro", "Amazon KDP", "Digital",
      2, 8000, "CLP", 16000, 16000, "transferencia", "Confirmada",
    ]);
  });

  it("returns only header row for empty input", () => {
    expect(salesAoa([])).toHaveLength(1);
  });

  it("length equals 1 header + N rows", () => {
    expect(salesAoa([row, row])).toHaveLength(3);
  });
});

// ── expensesAoa ───────────────────────────────────────────────────────────────

describe("expensesAoa", () => {
  const row: ExpenseRecord = {
    occurredAt: "01/06/2025",
    description: "Diseño portada",
    category: "Diseño",
    level: "Libro",
    book: "Mi novela",
    amount: 50000,
    currency: "CLP",
  };

  it("returns correct Spanish column headers", () => {
    expect(expensesAoa([])[0]).toEqual([
      "Fecha", "Descripción", "Categoría", "Nivel", "Libro", "Monto", "Moneda",
    ]);
  });

  it("maps a row correctly", () => {
    expect(expensesAoa([row])[1]).toEqual([
      "01/06/2025", "Diseño portada", "Diseño", "Libro", "Mi novela", 50000, "CLP",
    ]);
  });
});

// ── bookStockAoa ──────────────────────────────────────────────────────────────

describe("bookStockAoa", () => {
  const row: BookStockRecord = { title: "Obra maestra", inHand: 50, inBookstores: 20, totalPrinted: 200 };

  it("returns correct headers", () => {
    expect(bookStockAoa([])[0]).toEqual(["Libro", "En mano", "En librerías", "Total impreso"]);
  });

  it("maps a record correctly", () => {
    expect(bookStockAoa([row])[1]).toEqual(["Obra maestra", 50, 20, 200]);
  });
});

// ── consignmentAoa ────────────────────────────────────────────────────────────

describe("consignmentAoa", () => {
  const row: ConsignmentRecord = {
    channelName: "Librería Feria", stock: 15, soldCLP: 60000, receivedCLP: 40000, pendingCLP: 20000,
  };

  it("returns correct headers", () => {
    expect(consignmentAoa([])[0]).toEqual([
      "Librería", "Stock actual", "Vendido (CLP)", "Cobrado (CLP)", "Pendiente (CLP)",
    ]);
  });

  it("maps a record correctly", () => {
    expect(consignmentAoa([row])[1]).toEqual(["Librería Feria", 15, 60000, 40000, 20000]);
  });
});

// ── exchangesAoa ──────────────────────────────────────────────────────────────

describe("exchangesAoa", () => {
  const row: ExchangeRecord = {
    recipient: "Influencer A",
    bookTitle: "Mi libro",
    quantity: 2,
    sentAt: "01/05/2025",
    status: "Pendiente",
    expectedResult: "Reseña en Instagram",
    deadlineAt: "01/07/2025",
  };

  it("returns correct headers", () => {
    expect(exchangesAoa([])[0]).toEqual([
      "Destinatario", "Libro", "Cantidad", "Fecha envío", "Estado", "Resultado esperado", "Fecha límite",
    ]);
  });

  it("maps a record correctly", () => {
    expect(exchangesAoa([row])[1]).toEqual([
      "Influencer A", "Mi libro", 2, "01/05/2025", "Pendiente", "Reseña en Instagram", "01/07/2025",
    ]);
  });
});

// ── printRunPnlAoa ────────────────────────────────────────────────────────────

describe("printRunPnlAoa", () => {
  const row: PrintRunPnlRecord = {
    title: "Mi novela", runs: 2, printCost: 500000, revenue: 750000, result: 250000, pctRecovered: 100,
  };

  it("returns correct headers", () => {
    expect(printRunPnlAoa([])[0]).toEqual([
      "Libro", "Tiradas", "Costo impresión (CLP)", "Ingresos (CLP)", "Resultado (CLP)", "% Recuperado",
    ]);
  });

  it("maps a record correctly", () => {
    expect(printRunPnlAoa([row])[1]).toEqual(["Mi novela", 2, 500000, 750000, 250000, 100]);
  });
});

// ── merchPnlAoa ───────────────────────────────────────────────────────────────

describe("merchPnlAoa", () => {
  const row: MerchPnlRecord = { name: "Tote bag", units: 50, cost: 100000, revenue: 150000, result: 50000 };

  it("returns correct headers", () => {
    expect(merchPnlAoa([])[0]).toEqual([
      "Producto", "Unidades", "Costo producción (CLP)", "Ingresos (CLP)", "Resultado (CLP)",
    ]);
  });

  it("maps a record correctly", () => {
    expect(merchPnlAoa([row])[1]).toEqual(["Tote bag", 50, 100000, 150000, 50000]);
  });
});

// ── projectionsAoa ────────────────────────────────────────────────────────────

describe("projectionsAoa", () => {
  const row: ProjectionRecord = { month: "julio 2025", conservador: 800, realista: 1000, optimista: 1200 };

  it("returns correct headers", () => {
    expect(projectionsAoa([])[0]).toEqual([
      "Mes", "Conservador (−20%)", "Realista", "Optimista (+20%)",
    ]);
  });

  it("maps a record correctly", () => {
    expect(projectionsAoa([row])[1]).toEqual(["julio 2025", 800, 1000, 1200]);
  });
});

// ── buildCsvZip ───────────────────────────────────────────────────────────────

describe("buildCsvZip", () => {
  it("returns a valid zip (PK magic bytes)", async () => {
    const { buildCsvZip } = await import("@/lib/export");
    const zip = buildCsvZip([
      { name: "Ventas", aoa: [["A"], ["1"]] },
      { name: "Gastos", aoa: [["B"], ["2"]] },
    ]);
    expect(zip[0]).toBe(0x50); // P
    expect(zip[1]).toBe(0x4b); // K
  });

  it("contains one CSV entry per sheet with sanitized names", async () => {
    const { buildCsvZip } = await import("@/lib/export");
    const { unzipSync, strFromU8 } = await import("fflate");
    const zip = buildCsvZip([
      { name: "Stock Libros",  aoa: [["Libro"], ["Mi novela"]] },
      { name: "Tiradas P&L",   aoa: [["Libro"], ["Otra"]] },
    ]);
    const entries = unzipSync(zip);
    expect(Object.keys(entries).sort()).toEqual(["stock-libros.csv", "tiradas-p-l.csv"]);
    expect(strFromU8(entries["stock-libros.csv"])).toContain("Mi novela");
  });
});
