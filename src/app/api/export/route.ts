import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateAccount } from "@/lib/account";
import { toNum } from "@/lib/format";
import { saleToCLP, calcOutstanding, calcProjectionScenarios, calc3MonthAvg, STOCK_SIGN } from "@/lib/finance";
import { CATEGORY_LABELS, LEVEL_LABELS, CHANNEL_TYPE_LABEL } from "@/lib/labels";
import { getCachedReportesData } from "@/lib/data-cache";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  buildXlsx, buildCsv, buildCsvZip,
  salesAoa, expensesAoa, bookStockAoa, consignmentAoa,
  exchangesAoa, printRunPnlAoa, merchPnlAoa, projectionsAoa,
  type AOA, type SaleRecord, type ExpenseRecord, type BookStockRecord,
  type ConsignmentRecord, type ExchangeRecord, type PrintRunPnlRecord,
  type MerchPnlRecord, type ProjectionRecord,
} from "@/lib/export";

// ── Helpers ───────────────────────────────────────────────────────────────────

function periodStart(period: string): Date | null {
  const now = new Date();
  if (period === "mes") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === "año") return new Date(now.getFullYear(), 0, 1);
  return null;
}

function fmt(d: Date | string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("es-CL");
}

function rnd(n: number): number { return Math.round(n); }

function exportFilename(tab: string, period: string, ext: string): string {
  const now = new Date();
  const tabs: Record<string, string> = {
    all: "todo", ventas: "ventas", inventario: "inventario",
    finanzas: "finanzas", proyecciones: "proyecciones",
  };
  const periods: Record<string, string> = {
    mes:  now.toLocaleString("es-CL", { month: "long", year: "numeric" }).replace(" de ", "-"),
    año:  String(now.getFullYear()),
    todo: "historico",
  };
  return `${tabs[tab] ?? tab}-${periods[period] ?? now.toISOString().split("T")[0]}.${ext}`;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("No autorizado", { status: 401 });

  const account = await getOrCreateAccount(user.id, user.email ?? "");

  // 10 exports per minute per account — workbook generation is CPU-bound
  const rl = checkRateLimit(`export:${account.id}`, { limit: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    return new NextResponse("Demasiadas descargas. Espera un momento.", {
      status: 429,
      headers: { "Retry-After": String(rl.retryAfterSeconds) },
    });
  }

  const { searchParams } = new URL(req.url);

  const VALID_TABS    = ["all", "ventas", "inventario", "finanzas", "proyecciones"] as const;
  const VALID_PERIODS = ["mes", "año", "todo"] as const;
  const VALID_FORMATS = ["xlsx", "csv"] as const;

  type Tab    = typeof VALID_TABS[number];
  type Period = typeof VALID_PERIODS[number];
  type Format = typeof VALID_FORMATS[number];

  const rawTab    = searchParams.get("tab")    ?? "";
  const rawPeriod = searchParams.get("period") ?? "";
  const rawFormat = searchParams.get("format") ?? "";

  const tab:    Tab    = (VALID_TABS    as readonly string[]).includes(rawTab)    ? rawTab    as Tab    : "all";
  const period: Period = (VALID_PERIODS as readonly string[]).includes(rawPeriod) ? rawPeriod as Period : "todo";
  const format: Format = (VALID_FORMATS as readonly string[]).includes(rawFormat) ? rawFormat as Format : "xlsx";

  const start = periodStart(period);

  try {
    // ── Fetch data from shared cache (same dataset as reportes page) ──────────

    const {
      channels, allSales: rawSales, allExpenses: rawExpenses,
      allPayments, books, printRuns, bookMovements, allExchanges, merchandise,
    } = await getCachedReportesData(account.id);

    const channelMap = new Map(channels.map(c => [c.id, c]));

    // Apply period filter in-memory.
    // rawSales / rawExpenses are always full history; ventas/gastos sheets
    // are period-filtered while P&L / projection / inventory use full history.
    const allSales    = start ? rawSales.filter(s    => new Date(s.saleDate)    >= start) : rawSales;
    const allExpenses = start ? rawExpenses.filter(e => new Date(e.occurredAt)  >= start) : rawExpenses;

    // ── Transform: Ventas ─────────────────────────────────────────────────────

    const bookMap = new Map(books.map(b => [b.id, b]));

    const STATUS_LABELS: Record<string, string> = {
      CONFIRMED:        "Confirmada",
      DELIVERED:        "Entregada",
      PENDING_DELIVERY: "Pend. entrega",
      CANCELLED:        "Cancelada",
    };

    const saleRecords: SaleRecord[] = allSales.map(s => ({
      saleDate:      fmt(s.saleDate),
      item:          s.bookId ? (bookMap.get(s.bookId)?.title ?? "Libro") : (s.merchandise?.name ?? "Merchandising"),
      channelName:   s.channel.name,
      channelType:   CHANNEL_TYPE_LABEL[s.channel.type] ?? s.channel.type,
      quantity:      s.quantity,
      unitPrice:     s.isBulk ? `≈ ${rnd(toNum(s.unitPrice))}` : rnd(toNum(s.unitPrice)),
      currency:      s.currency,
      totalAmount:   rnd(toNum(s.totalAmount)),
      amountCLP:     rnd(saleToCLP(s)),
      paymentMethod: s.paymentMethod ?? "",
      status:        STATUS_LABELS[s.status] ?? s.status,
    }));

    // ── Transform: Gastos ─────────────────────────────────────────────────────

    const expenseRecords: ExpenseRecord[] = allExpenses.map(e => ({
      occurredAt:  fmt(e.occurredAt),
      description: e.description,
      category:    CATEGORY_LABELS[e.category] ?? e.category,
      level:       LEVEL_LABELS[e.level] ?? e.level,
      book:        e.book?.title ?? "",
      amount:      rnd(toNum(e.amount)),
      currency:    e.currency,
    }));

    // ── Transform: Inventario ─────────────────────────────────────────────────

    const stockByBook      = new Map<string, number>();
    const inStoreByBook    = new Map<string, number>();
    const inStoreByChannel = new Map<string, number>();

    for (const m of bookMovements) {
      if (!m.bookId) continue;
      const sign = (STOCK_SIGN as Record<string, number>)[m.type] ?? 0;
      stockByBook.set(m.bookId, (stockByBook.get(m.bookId) ?? 0) + sign * m.quantity);
      if (m.type === "SEND_TO_BOOKSTORE") {
        inStoreByBook.set(m.bookId, (inStoreByBook.get(m.bookId) ?? 0) + m.quantity);
        if (m.channelId) inStoreByChannel.set(m.channelId, (inStoreByChannel.get(m.channelId) ?? 0) + m.quantity);
      }
      if (m.type === "BOOKSTORE_RETURN") {
        inStoreByBook.set(m.bookId, (inStoreByBook.get(m.bookId) ?? 0) - m.quantity);
        if (m.channelId) inStoreByChannel.set(m.channelId, (inStoreByChannel.get(m.channelId) ?? 0) - m.quantity);
      }
    }

    const printBooks = books.filter(b => b.formats.includes("PRINT"));

    const bookStockRecords: BookStockRecord[] = printBooks.map(b => ({
      title:        b.title,
      inHand:       Math.max(0, stockByBook.get(b.id) ?? 0),
      inBookstores: Math.max(0, inStoreByBook.get(b.id) ?? 0),
      totalPrinted: printRuns.filter(r => r.bookId === b.id).reduce((s, r) => s + r.quantity, 0),
    }));

    // Consignment uses full history (not period-filtered) — outstanding is lifetime.
    const salesByChannel    = new Map<string, number>();
    const paymentsByChannel = new Map<string, number>();
    for (const s of rawSales)   salesByChannel.set(s.channelId, (salesByChannel.get(s.channelId) ?? 0) + saleToCLP(s));
    for (const p of allPayments) paymentsByChannel.set(p.channelId, (paymentsByChannel.get(p.channelId) ?? 0) + toNum(p.amount));

    const consignmentRecords: ConsignmentRecord[] = channels
      .filter(c => c.type === "BOOKSTORE")
      .map(ch => ({
        channelName: ch.name,
        stock:       Math.max(0, inStoreByChannel.get(ch.id) ?? 0),
        soldCLP:     rnd(salesByChannel.get(ch.id) ?? 0),
        receivedCLP: rnd(paymentsByChannel.get(ch.id) ?? 0),
        pendingCLP:  rnd(calcOutstanding(salesByChannel.get(ch.id) ?? 0, paymentsByChannel.get(ch.id) ?? 0)),
      }))
      .filter(r => r.soldCLP > 0 || r.stock > 0);

    const EXCHANGE_STATUS: Record<string, string> = {
      PENDING: "Pendiente", FULFILLED: "Cumplido", UNFULFILLED: "No cumplido",
    };

    const exchangeRecords: ExchangeRecord[] = allExchanges.map(e => ({
      recipient:      e.recipient,
      bookTitle:      e.book.title,
      quantity:       e.quantity,
      sentAt:         fmt(e.sentAt),
      status:         EXCHANGE_STATUS[e.status] ?? e.status,
      expectedResult: e.expectedResult ?? "",
      deadlineAt:     fmt(e.deadlineAt),
    }));

    // ── Transform: Finanzas P&L (full history, not period-filtered) ──────────

    const printCostByBook = new Map<string, number>();
    for (const r of printRuns) {
      printCostByBook.set(r.bookId, (printCostByBook.get(r.bookId) ?? 0) + toNum(r.totalCost));
    }

    const printRunPnlRecords: PrintRunPnlRecord[] = printBooks
      .filter(b => (printCostByBook.get(b.id) ?? 0) > 0)
      .map(b => {
        const cost = printCostByBook.get(b.id) ?? 0;
        const rev  = rawSales.filter(s => s.bookId === b.id).reduce((s, x) => s + saleToCLP(x), 0);
        const runs = printRuns.filter(r => r.bookId === b.id).length;
        return {
          title: b.title, runs, printCost: rnd(cost), revenue: rnd(rev),
          result: rnd(rev - cost), pctRecovered: rnd(cost > 0 ? Math.min((rev / cost) * 100, 100) : 0),
        };
      });

    const merchPnlRecords: MerchPnlRecord[] = merchandise.map(m => {
      const cost    = m.productionBatches.reduce((s, b) => s + toNum(b.totalCost), 0);
      const revenue = m.sales.reduce((s, x) => s + saleToCLP(x), 0);
      const units   = m.sales.reduce((s, x) => s + x.quantity, 0);
      return { name: m.name, units, cost: rnd(cost), revenue: rnd(revenue), result: rnd(revenue - cost) };
    }).filter(m => m.cost > 0 || m.revenue > 0);

    // ── Transform: Proyecciones (full history for accuracy) ──────────────────

    const now = new Date();
    const histMonths = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      return { start: d, end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59) };
    });

    const historicalRevenue = histMonths.map(({ start: s, end: e }) =>
      rawSales
        .filter(sale => { const d = new Date(sale.saleDate); return d >= s && d <= e; })
        .reduce((sum, x) => sum + saleToCLP(x), 0)
    );

    const avg3 = calc3MonthAvg(historicalRevenue);
    const projectionRecords: ProjectionRecord[] = Array.from({ length: 6 }, (_, i) => {
      const d  = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
      const sc = calcProjectionScenarios(avg3);
      return {
        month: d.toLocaleString("es-CL", { month: "long", year: "numeric" }),
        conservador: sc.conservador, realista: sc.realista, optimista: sc.optimista,
      };
    });

    // ── Build sheets ──────────────────────────────────────────────────────────

    const SHEET_SETS: Record<string, { name: string; aoa: AOA }[]> = {
      ventas:       [{ name: "Ventas",          aoa: salesAoa(saleRecords) }],
      inventario:   [
        { name: "Stock Libros",   aoa: bookStockAoa(bookStockRecords) },
        { name: "Consignaciones", aoa: consignmentAoa(consignmentRecords) },
        { name: "Canjes",         aoa: exchangesAoa(exchangeRecords) },
      ],
      finanzas:     [
        { name: "Gastos",      aoa: expensesAoa(expenseRecords) },
        { name: "Tiradas P&L", aoa: printRunPnlAoa(printRunPnlRecords) },
        { name: "Merch P&L",   aoa: merchPnlAoa(merchPnlRecords) },
      ],
      proyecciones: [{ name: "Proyecciones", aoa: projectionsAoa(projectionRecords) }],
    };
    SHEET_SETS.all = [
      ...SHEET_SETS.ventas,
      ...SHEET_SETS.inventario,
      ...SHEET_SETS.finanzas,
      ...SHEET_SETS.proyecciones,
    ];

    const sheets = SHEET_SETS[tab] ?? SHEET_SETS.all;

    if (format === "csv") {
      // Multi-sheet tabs return a single .zip so the browser fires one download
      if (sheets.length > 1) {
        const zip = buildCsvZip(sheets);
        return new NextResponse(new Uint8Array(zip), {
          headers: {
            "Content-Type":        "application/zip",
            "Content-Disposition": `attachment; filename="${exportFilename(tab, period, "zip")}"`,
          },
        });
      }
      const csv = buildCsv(sheets[0].aoa);
      return new NextResponse(csv, {
        headers: {
          "Content-Type":        "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${exportFilename(tab, period, "csv")}"`,
        },
      });
    }

    const fname = exportFilename(tab, period, "xlsx");

    const buffer = buildXlsx(sheets);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fname}"`,
      },
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[/api/export] export failed:", message);
    return new NextResponse("Error al generar el archivo.", { status: 500 });
  }
}
