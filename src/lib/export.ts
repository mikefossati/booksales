import * as XLSX from "xlsx";
import { zipSync, strToU8 } from "fflate";

// ── Core types ────────────────────────────────────────────────────────────────

type Cell = string | number | null;
export type AOA = Cell[][];                     // array-of-arrays, first row = headers

// ── Record types (plain JS, no Prisma) ───────────────────────────────────────

export type SaleRecord = {
  saleDate:      string;   // pre-formatted "DD/MM/YYYY"
  item:          string;
  channelName:   string;
  channelType:   string;
  quantity:      number;
  unitPrice:     number | string; // string ("≈ N") for bulk sales — derived average
  currency:      string;
  totalAmount:   number;
  amountCLP:     number;
  paymentMethod: string;
  status:        string;
};

export type ExpenseRecord = {
  occurredAt:  string;
  description: string;
  category:    string;
  level:       string;
  book:        string;
  amount:      number;
  currency:    string;
};

export type BookStockRecord = {
  title:        string;
  perInventory: number[]; // aligned with the inventoryNames passed to bookStockAoa
  total:        number;
  totalPrinted: number;
};

export type ConsignmentRecord = {
  channelName: string;
  stock:       number;
  soldCLP:     number;
  receivedCLP: number;
  pendingCLP:  number;
};

export type ExchangeRecord = {
  recipient:      string;
  bookTitle:      string;
  quantity:       number;
  sentAt:         string;
  status:         string;
  expectedResult: string;
  deadlineAt:     string;
};

export type PrintRunPnlRecord = {
  title:        string;
  runs:         number;
  printCost:    number;
  revenue:      number;
  result:       number;
  pctRecovered: number;
};

export type MerchPnlRecord = {
  name:    string;
  units:   number;
  cost:    number;
  revenue: number;
  result:  number;
};

export type ProjectionRecord = {
  month:       string;
  conservador: number;
  realista:    number;
  optimista:   number;
};

// ── AOA builders ──────────────────────────────────────────────────────────────

export function salesAoa(rows: SaleRecord[]): AOA {
  return [
    ["Fecha", "Libro / Producto", "Canal", "Tipo canal", "Unidades",
     "Precio unit.", "Moneda", "Total (moneda)", "Total CLP", "Pago", "Estado"],
    ...rows.map(r => [
      r.saleDate, r.item, r.channelName, r.channelType,
      r.quantity, r.unitPrice, r.currency, r.totalAmount, r.amountCLP,
      r.paymentMethod, r.status,
    ]),
  ];
}

export function expensesAoa(rows: ExpenseRecord[]): AOA {
  return [
    ["Fecha", "Descripción", "Categoría", "Nivel", "Libro", "Monto", "Moneda"],
    ...rows.map(r => [
      r.occurredAt, r.description, r.category, r.level,
      r.book, r.amount, r.currency,
    ]),
  ];
}

export function bookStockAoa(rows: BookStockRecord[], inventoryNames: string[]): AOA {
  return [
    ["Libro", ...inventoryNames, "Total", "Total impreso"],
    ...rows.map(r => [r.title, ...r.perInventory, r.total, r.totalPrinted]),
  ];
}

export function consignmentAoa(rows: ConsignmentRecord[]): AOA {
  return [
    ["Librería", "Stock actual", "Vendido (CLP)", "Cobrado (CLP)", "Pendiente (CLP)"],
    ...rows.map(r => [r.channelName, r.stock, r.soldCLP, r.receivedCLP, r.pendingCLP]),
  ];
}

export function exchangesAoa(rows: ExchangeRecord[]): AOA {
  return [
    ["Destinatario", "Libro", "Cantidad", "Fecha envío", "Estado", "Resultado esperado", "Fecha límite"],
    ...rows.map(r => [
      r.recipient, r.bookTitle, r.quantity, r.sentAt,
      r.status, r.expectedResult, r.deadlineAt,
    ]),
  ];
}

export function printRunPnlAoa(rows: PrintRunPnlRecord[]): AOA {
  return [
    ["Libro", "Tiradas", "Costo impresión (CLP)", "Ingresos (CLP)", "Resultado (CLP)", "% Recuperado"],
    ...rows.map(r => [
      r.title, r.runs, r.printCost, r.revenue, r.result, r.pctRecovered,
    ]),
  ];
}

export function merchPnlAoa(rows: MerchPnlRecord[]): AOA {
  return [
    ["Producto", "Unidades", "Costo producción (CLP)", "Ingresos (CLP)", "Resultado (CLP)"],
    ...rows.map(r => [r.name, r.units, r.cost, r.revenue, r.result]),
  ];
}

export function projectionsAoa(rows: ProjectionRecord[]): AOA {
  return [
    ["Mes", "Conservador (−20%)", "Realista", "Optimista (+20%)"],
    ...rows.map(r => [r.month, r.conservador, r.realista, r.optimista]),
  ];
}

// ── File generators ───────────────────────────────────────────────────────────

function makeWorksheet(aoa: AOA): XLSX.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  if (aoa.length > 0) {
    ws["!cols"] = aoa[0].map((_, col) => {
      const max = Math.max(...aoa.slice(0, 50).map(row => String(row[col] ?? "").length));
      return { wch: Math.max(10, Math.min(max + 2, 45)) };
    });
  }
  return ws;
}

export function buildXlsx(sheets: { name: string; aoa: AOA }[]): Buffer {
  const wb = XLSX.utils.book_new();
  for (const { name, aoa } of sheets) {
    XLSX.utils.book_append_sheet(wb, makeWorksheet(aoa), name);
  }
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function buildCsv(aoa: AOA): string {
  const escape = (v: Cell): string => {
    if (v == null) return "";
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  // UTF-8 BOM so Excel opens it correctly
  return "﻿" + aoa.map(row => row.map(escape).join(",")).join("\r\n");
}

/** Zip of one CSV per sheet — single download for multi-sheet exports. */
export function buildCsvZip(sheets: { name: string; aoa: AOA }[]): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  for (const { name, aoa } of sheets) {
    const filename = name.toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, "-") + ".csv";
    entries[filename] = strToU8(buildCsv(aoa));
  }
  return zipSync(entries, { level: 6 });
}
