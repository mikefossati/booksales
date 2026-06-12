import { formatCurrency, formatDate } from "@/lib/format";

// ── Derived notifications ─────────────────────────────────────────────────────
// Notifications are *derived from current data state* on every render — there
// is no inbox to maintain. Only dismissals are persisted, keyed by an identity
// string that also encodes the relevant state, so a dismissed notification
// resurfaces automatically when something real changes (new delivery date,
// higher debt, lower stock, …).

export type NotificationSeverity = "action" | "warning" | "info" | "success";

export type AppNotification = {
  key: string;
  type:
    | "INCOMING_PRINT_RUN"
    | "RUN_ARRIVED"
    | "PAYMENT_DUE"
    | "LOW_STOCK"
    | "EXCHANGE_OVERDUE";
  severity: NotificationSeverity;
  message: string;
  href?: string;
  dismissible: boolean;
};

export const SEVERITY_ORDER: Record<NotificationSeverity, number> = {
  action: 0,
  warning: 1,
  info: 2,
  success: 3,
};

export const LOW_STOCK_THRESHOLD = 10;
const ARRIVED_WINDOW_DAYS = 7;

const dayKey = (d: Date | string) => new Date(d).toISOString().slice(0, 10);

export type NotificationInputs = {
  now?: Date;
  currency: string;
  books: { id: string; title: string }[];
  printRuns: {
    id: string;
    bookId: string;
    quantity: number;
    receivedAt: Date | string;
    createdAt?: Date | string;
  }[];
  /** All-time outstanding per payable channel (already netted against payments). */
  channelsOutstanding: { id: string; name: string; outstanding: number }[];
  /** Current stock in the personal (default) inventory, per print book. */
  stockByBook: { bookId: string; stock: number }[];
  exchanges: {
    id: string;
    recipient: string;
    status: string;
    deadlineAt: Date | string | null;
  }[];
};

export function deriveNotifications(inputs: NotificationInputs): AppNotification[] {
  const now = inputs.now ?? new Date();
  const bookTitle = new Map(inputs.books.map(b => [b.id, b.title]));
  const out: AppNotification[] = [];

  // ── Tiradas en camino / recién llegadas ────────────────────────────────────
  const arrivedFloor = new Date(now.getTime() - ARRIVED_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  for (const run of inputs.printRuns) {
    const title = bookTitle.get(run.bookId);
    if (!title) continue;
    const received = new Date(run.receivedAt);

    if (received > now) {
      out.push({
        key: `incoming-run:${run.id}:${dayKey(received)}`,
        type: "INCOMING_PRINT_RUN",
        severity: "info",
        message: `${run.quantity.toLocaleString("es-CL")} ejemplares de «${title}» llegarán el ${formatDate(received)}`,
        href: `/libros/${run.bookId}?tab=tiradas`,
        dismissible: true,
      });
    } else if (
      received >= arrivedFloor &&
      // Only runs that were registered *before* their delivery date were ever
      // "in transit" — registering a past tirada shouldn't announce an arrival.
      run.createdAt != null &&
      new Date(run.createdAt) < received
    ) {
      out.push({
        key: `run-arrived:${run.id}:${dayKey(received)}`,
        type: "RUN_ARRIVED",
        severity: "success",
        message: `Llegaron ${run.quantity.toLocaleString("es-CL")} ejemplares de «${title}» — stock actualizado`,
        href: `/libros/${run.bookId}?tab=tiradas`,
        dismissible: true,
      });
    }
  }

  // ── Cobros pendientes ──────────────────────────────────────────────────────
  for (const ch of inputs.channelsOutstanding) {
    if (ch.outstanding <= 0) continue;
    out.push({
      key: `payment-due:${ch.id}:${Math.round(ch.outstanding)}`,
      type: "PAYMENT_DUE",
      severity: "action",
      message: `«${ch.name}» te debe ${formatCurrency(ch.outstanding, inputs.currency)}`,
      href: "/finanzas?tab=deben",
      dismissible: true,
    });
  }

  // ── Stock bajo (inventario personal) ───────────────────────────────────────
  for (const { bookId, stock } of inputs.stockByBook) {
    if (stock <= 0 || stock > LOW_STOCK_THRESHOLD) continue;
    const title = bookTitle.get(bookId);
    if (!title) continue;
    out.push({
      key: `low-stock:${bookId}:${stock}`,
      type: "LOW_STOCK",
      severity: "warning",
      message: `Stock bajo — «${title}» (${stock} ej. en mano)`,
      href: `/libros/${bookId}`,
      dismissible: true,
    });
  }

  // ── Canjes vencidos ────────────────────────────────────────────────────────
  for (const ex of inputs.exchanges) {
    if (ex.status !== "PENDING" || !ex.deadlineAt) continue;
    const deadline = new Date(ex.deadlineAt);
    if (deadline >= now) continue;
    out.push({
      key: `exchange-overdue:${ex.id}:${dayKey(deadline)}`,
      type: "EXCHANGE_OVERDUE",
      severity: "warning",
      message: `El canje con «${ex.recipient}» venció el ${formatDate(deadline)}`,
      href: "/libros?tab=canjes",
      dismissible: true,
    });
  }

  return out.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

/** Visible notifications after removing dismissed keys. */
export function filterDismissed(
  notifications: AppNotification[],
  dismissedKeys: Iterable<string>,
): AppNotification[] {
  const dismissed = new Set(dismissedKeys);
  return notifications.filter(n => !dismissed.has(n.key));
}

/** Dismissal keys whose notification no longer derives — safe to delete. */
export function staleDismissalKeys(
  notifications: AppNotification[],
  dismissedKeys: Iterable<string>,
): string[] {
  const active = new Set(notifications.map(n => n.key));
  return [...dismissedKeys].filter(k => !active.has(k));
}
