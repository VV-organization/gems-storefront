import { describe, expect, it, vi } from "vitest";
import { loadAppConfig } from "../../config/app-config";
import { IntegrationHealthService } from "./integration-health.service";
const config = loadAppConfig({ NODE_ENV: "test", CATALOG_PUBLIC_GAMES: "cs2,rust,tf2" });
const healthy = { total: "10", available: "8", snapshot_age_seconds: 20 };
const price = { active_count: "1", supplier_currency: "USD", fiat_currency: "RUB", supplier_to_fiat_rate_minor: 9500, coin_rate_numerator: 2, coin_rate_denominator: 1, markup_bps: 2000, min_price_coin_minor: 1, round_to_coin_minor: 1, valid_from: new Date("2020-01-01") };
function service(rows: unknown[]) { return new IntegrationHealthService({ query: vi.fn().mockResolvedValue({ rows }) } as never, config); }
describe("operational integration health", () => {
  it("reports a DB error with a fixed code only", async () => {
    const health = new IntegrationHealthService({ query: vi.fn().mockRejectedValue(new Error("postgres://secret:password@internal")) } as never, config);
    expect(await health.postgres()).toEqual({ status: "down", reasons: ["POSTGRES_UNAVAILABLE"] });
    expect(await health.catalogGame("cs2")).toEqual({ status: "down", reasons: ["CATALOG_CS2_UNAVAILABLE"] });
  });
  it("reports an actual unreachable Redis endpoint without driver details", async () => {
    const health = new IntegrationHealthService({} as never, loadAppConfig({ NODE_ENV: "test", REDIS_URL: "redis://127.0.0.1:1" }));
    expect(await health.redis()).toEqual({ status: "down", reasons: ["REDIS_UNAVAILABLE"] });
  });
  it("redacts database errors from the pricing check", async () => {
    const health = new IntegrationHealthService({ query: vi.fn().mockRejectedValue(new Error("postgres://secret:password@internal")) } as never, config);
    expect(await health.pricing()).toEqual({ status: "down", reasons: ["CATALOG_PRICING_UNAVAILABLE"] });
  });
  it("requires a published and available catalog with a recent observed snapshot", async () => {
    expect(await service([healthy]).catalogGame("cs2")).toMatchObject({ status: "ok", total: 10, available: 8, snapshotAgeSeconds: 20 });
  });
  it.each([
    [{ ...healthy, total: "0" }, "CATALOG_CS2_EMPTY"],
    [{ ...healthy, available: "0" }, "CATALOG_CS2_UNAVAILABLE"],
    [{ ...healthy, snapshot_age_seconds: null }, "CATALOG_CS2_SYNC_MISSING"],
    [{ ...healthy, snapshot_age_seconds: 900 }, "CATALOG_CS2_STALE"],
    [{ ...healthy, snapshot_age_seconds: -1 }, "CATALOG_CS2_STALE"],
  ])("rejects unhealthy catalog evidence %#", async (row, reason) => {
    const result = await service([row]).catalogGame("cs2");
    expect(result.status).toBe("down");
    expect(result.reasons).toContain(reason);
  });
  it("does not hide stale Rust and TF2 behind a fresh CS2 snapshot", async () => {
    const query = vi.fn().mockImplementation((_sql: string, params: string[]) => Promise.resolve({ rows: [{ ...healthy, snapshot_age_seconds: params[0] === "cs2" ? 20 : 1000 }] }));
    const result = await new IntegrationHealthService({ query } as never, config).visibleCatalog();
    expect(result.status).toBe("down");
    expect(result.reasons).toEqual(["CATALOG_RUST_STALE", "CATALOG_TF2_STALE"]);
  });
  it("accepts valid configured Gems pricing", async () => {
    expect(await service([price]).pricing()).toEqual({ status: "ok" });
  });
  it.each([
    { ...price, active_count: "0" }, { ...price, active_count: "2" },
    { ...price, coin_rate_numerator: 8, coin_rate_denominator: 5 },
    { ...price, supplier_to_fiat_rate_minor: 0 }, { ...price, coin_rate_denominator: 0 },
    { ...price, round_to_coin_minor: 0 }, { ...price, markup_bps: -1 },
    { ...price, fiat_currency: "USD" }, { ...price, valid_from: new Date("2100-01-01") },
  ])("rejects invalid or conflicting pricing configuration %#", async row => {
    expect(await service([row]).pricing()).toEqual({ status: "down", reasons: ["CATALOG_PRICING_INVALID"] });
  });
});
