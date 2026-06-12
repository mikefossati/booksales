import { describe, it, expect } from "vitest";
import {
  deriveNotifications,
  filterDismissed,
  staleDismissalKeys,
  type NotificationInputs,
} from "@/lib/notifications";

const NOW = new Date("2026-06-11T12:00:00");

const base: NotificationInputs = {
  now: NOW,
  currency: "CLP",
  books: [{ id: "b1", title: "Luna de Papel" }],
  printRuns: [],
  channelsOutstanding: [],
  stockByBook: [],
  exchanges: [],
};

const run = (over: Partial<NotificationInputs["printRuns"][number]> = {}) => ({
  id: "r1",
  bookId: "b1",
  quantity: 200,
  receivedAt: new Date("2026-07-01T12:00:00"),
  createdAt: new Date("2026-06-10T12:00:00"),
  ...over,
});

// ─────────────────────────────────────────────────────────────────────────────
// INCOMING_PRINT_RUN
// ─────────────────────────────────────────────────────────────────────────────

describe("deriveNotifications — tiradas en camino", () => {
  it("emits a notification for a future-dated print run", () => {
    const [n] = deriveNotifications({ ...base, printRuns: [run()] });
    expect(n.type).toBe("INCOMING_PRINT_RUN");
    expect(n.severity).toBe("info");
    expect(n.message).toContain("200 ejemplares de «Luna de Papel»");
    expect(n.message).toContain("llegarán el");
    expect(n.href).toBe("/libros/b1?tab=tiradas");
    expect(n.dismissible).toBe(true);
  });

  it("key encodes the delivery date — changing it resurfaces the notification", () => {
    const [a] = deriveNotifications({ ...base, printRuns: [run()] });
    const [b] = deriveNotifications({
      ...base,
      printRuns: [run({ receivedAt: new Date("2026-08-15T12:00:00") })],
    });
    expect(a.key).toBe("incoming-run:r1:2026-07-01");
    expect(b.key).toBe("incoming-run:r1:2026-08-15");
    expect(a.key).not.toBe(b.key);
  });

  it("ignores runs for unknown books", () => {
    const out = deriveNotifications({ ...base, books: [], printRuns: [run()] });
    expect(out).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RUN_ARRIVED
// ─────────────────────────────────────────────────────────────────────────────

describe("deriveNotifications — tiradas llegadas", () => {
  it("announces an arrival within the last 7 days when the run was in transit", () => {
    const [n] = deriveNotifications({
      ...base,
      printRuns: [run({
        receivedAt: new Date("2026-06-09T12:00:00"),
        createdAt:  new Date("2026-06-01T12:00:00"),
      })],
    });
    expect(n.type).toBe("RUN_ARRIVED");
    expect(n.severity).toBe("success");
    expect(n.message).toContain("Llegaron 200 ejemplares");
  });

  it("does not announce runs registered after their delivery date (backfilled data)", () => {
    const out = deriveNotifications({
      ...base,
      printRuns: [run({
        receivedAt: new Date("2026-06-09T12:00:00"),
        createdAt:  new Date("2026-06-09T13:00:00"),
      })],
    });
    expect(out).toHaveLength(0);
  });

  it("does not announce arrivals older than 7 days", () => {
    const out = deriveNotifications({
      ...base,
      printRuns: [run({
        receivedAt: new Date("2026-06-01T12:00:00"),
        createdAt:  new Date("2026-05-01T12:00:00"),
      })],
    });
    expect(out).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT_DUE / LOW_STOCK / EXCHANGE_OVERDUE
// ─────────────────────────────────────────────────────────────────────────────

describe("deriveNotifications — cobros pendientes", () => {
  it("emits an action notification with the amount in the key", () => {
    const [n] = deriveNotifications({
      ...base,
      channelsOutstanding: [{ id: "c1", name: "Librería Sur", outstanding: 45000 }],
    });
    expect(n.type).toBe("PAYMENT_DUE");
    expect(n.severity).toBe("action");
    expect(n.key).toBe("payment-due:c1:45000");
    expect(n.message).toContain("«Librería Sur» te debe");
  });

  it("skips channels with nothing outstanding", () => {
    const out = deriveNotifications({
      ...base,
      channelsOutstanding: [{ id: "c1", name: "X", outstanding: 0 }],
    });
    expect(out).toHaveLength(0);
  });
});

describe("deriveNotifications — stock bajo", () => {
  it("fires for 1..threshold, not for 0 or above threshold", () => {
    const out = deriveNotifications({
      ...base,
      books: [
        { id: "b1", title: "A" },
        { id: "b2", title: "B" },
        { id: "b3", title: "C" },
        { id: "b4", title: "D" },
      ],
      stockByBook: [
        { bookId: "b1", stock: 0 },
        { bookId: "b2", stock: 1 },
        { bookId: "b3", stock: 10 },
        { bookId: "b4", stock: 11 },
      ],
    });
    expect(out.map(n => n.key)).toEqual(["low-stock:b2:1", "low-stock:b3:10"]);
  });
});

describe("deriveNotifications — canjes vencidos", () => {
  it("fires only for PENDING exchanges past their deadline", () => {
    const out = deriveNotifications({
      ...base,
      exchanges: [
        { id: "e1", recipient: "@influencer", status: "PENDING",   deadlineAt: new Date("2026-06-02T12:00:00") },
        { id: "e2", recipient: "otro",        status: "FULFILLED", deadlineAt: new Date("2026-06-02T12:00:00") },
        { id: "e3", recipient: "futuro",      status: "PENDING",   deadlineAt: new Date("2026-07-02T12:00:00") },
        { id: "e4", recipient: "sin fecha",   status: "PENDING",   deadlineAt: null },
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0].key).toBe("exchange-overdue:e1:2026-06-02");
    expect(out[0].message).toContain("venció el");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Ordering, dismissal filtering, stale cleanup
// ─────────────────────────────────────────────────────────────────────────────

describe("deriveNotifications — orden y dismissals", () => {
  const inputs: NotificationInputs = {
    ...base,
    printRuns: [run()], // info
    channelsOutstanding: [{ id: "c1", name: "Lib", outstanding: 1000 }], // action
    stockByBook: [{ bookId: "b1", stock: 3 }], // warning
  };

  it("sorts action → warning → info", () => {
    const out = deriveNotifications(inputs);
    expect(out.map(n => n.severity)).toEqual(["action", "warning", "info"]);
  });

  it("filterDismissed removes dismissed keys", () => {
    const out = deriveNotifications(inputs);
    const visible = filterDismissed(out, ["payment-due:c1:1000"]);
    expect(visible.map(n => n.type)).toEqual(["LOW_STOCK", "INCOMING_PRINT_RUN"]);
  });

  it("staleDismissalKeys flags dismissals whose notification no longer derives", () => {
    const out = deriveNotifications(inputs);
    const stale = staleDismissalKeys(out, [
      "payment-due:c1:1000",       // still active
      "incoming-run:r1:2026-01-01", // old delivery date → stale
      "low-stock:b1:9",             // stock changed → stale
    ]);
    expect(stale).toEqual(["incoming-run:r1:2026-01-01", "low-stock:b1:9"]);
  });
});
