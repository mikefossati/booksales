import { describe, it, expect } from "vitest";
import {
  isProActive,
  hasFeature,
  FREE_LIMITS,
  type PlanFeature,
} from "@/lib/plan";

const FREE_ACCOUNT    = { plan: "FREE" as const, planExpiresAt: null };
const PRO_NO_EXPIRY   = { plan: "PRO"  as const, planExpiresAt: null };
const PRO_ACTIVE      = { plan: "PRO"  as const, planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) };
const PRO_EXPIRED     = { plan: "PRO"  as const, planExpiresAt: new Date(Date.now() - 1) };

// ─── FREE_LIMITS ─────────────────────────────────────────────────────────────

describe("FREE_LIMITS", () => {
  it("allows 1 book on free plan", () => {
    expect(FREE_LIMITS.BOOKS).toBe(1);
  });

  it("allows 3 channels on free plan", () => {
    expect(FREE_LIMITS.CHANNELS).toBe(3);
  });
});

// ─── isProActive ─────────────────────────────────────────────────────────────

describe("isProActive", () => {
  it("returns false for FREE plan", () => {
    expect(isProActive(FREE_ACCOUNT)).toBe(false);
  });

  it("returns true for PRO with no expiry (lifetime)", () => {
    expect(isProActive(PRO_NO_EXPIRY)).toBe(true);
  });

  it("returns true for PRO with future expiry", () => {
    expect(isProActive(PRO_ACTIVE)).toBe(true);
  });

  it("returns false for PRO with past expiry", () => {
    expect(isProActive(PRO_EXPIRED)).toBe(false);
  });
});

// ─── hasFeature ──────────────────────────────────────────────────────────────
// All current features require an active Pro plan.
// unlimited_books / unlimited_channels are count limits (FREE_LIMITS), not flags.

const ALL_FEATURES: PlanFeature[] = [
  "payments",
  "exports",
  "merchandise",
  "exchanges",
  "reports_history",
];

describe("hasFeature — FREE account", () => {
  it.each(ALL_FEATURES)("%s is locked on FREE", (feature) => {
    expect(hasFeature(FREE_ACCOUNT, feature)).toBe(false);
  });
});

describe("hasFeature — PRO lifetime", () => {
  it.each(ALL_FEATURES)("%s is unlocked on PRO (no expiry)", (feature) => {
    expect(hasFeature(PRO_NO_EXPIRY, feature)).toBe(true);
  });
});

describe("hasFeature — PRO with active expiry", () => {
  it.each(ALL_FEATURES)("%s is unlocked on PRO (future expiry)", (feature) => {
    expect(hasFeature(PRO_ACTIVE, feature)).toBe(true);
  });
});

describe("hasFeature — PRO expired", () => {
  it.each(ALL_FEATURES)("%s is locked when PRO has lapsed", (feature) => {
    expect(hasFeature(PRO_EXPIRED, feature)).toBe(false);
  });
});

// ─── Feature gate consistency ─────────────────────────────────────────────────
// Verifies hasFeature delegates to isProActive correctly.

describe("hasFeature mirrors isProActive for all Pro-only features", () => {
  it.each(ALL_FEATURES)("%s: hasFeature === isProActive", (feature) => {
    for (const acct of [FREE_ACCOUNT, PRO_NO_EXPIRY, PRO_ACTIVE, PRO_EXPIRED]) {
      expect(hasFeature(acct, feature)).toBe(isProActive(acct));
    }
  });
});
