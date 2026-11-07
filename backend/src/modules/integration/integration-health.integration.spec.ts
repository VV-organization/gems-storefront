import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DatabaseService } from "../../common/database/database.service";
import { requireSafeTestDatabase } from "../../common/database/test-database";
import { loadAppConfig } from "../../config/app-config";
import { IntegrationHealthService } from "./integration-health.service";
const target = process.env.GEMS_TEST_DATABASE_URL;

describe.skipIf(!target)("read-only operational monitoring on PostgreSQL", () => {
  let pool: Pool;
  let database: DatabaseService;
  let health: IntegrationHealthService;
  beforeAll(async () => {
    const url = requireSafeTestDatabase(target);
    pool = new Pool({ connectionString: url });
    await pool.query("DELETE FROM catalog_products");
    await pool.query("DELETE FROM supplier_listings");
    await pool.query("DELETE FROM catalog_sync_runs");
    await pool.query(`
      INSERT INTO catalog_sync_runs(source,game,status,observed_at,finished_at,row_count)
      SELECT 'sih',game,'promoted',now(),now(),1 FROM unnest(ARRAY['cs2','rust','tf2']) game;
      INSERT INTO supplier_listings(supplier,game,market_hash_name,active,available_quantity,price_microusd,last_sync_run_id)
      SELECT 'sih',game,'Same item',true,1,1000000,id FROM catalog_sync_runs;
      INSERT INTO catalog_products(id,slug,kind,category,category_id,game,product_type,title,description,price_coin_minor,availability,fulfillment_mode,popularity,meta,keywords,details,public_enabled,supplier_provider,supplier_item_id)
      SELECT 'monitor-'||game,'monitor-'||game,'skins','Skins','rifle',game,'Rifle','Same item','',100,'available','steam-trade',0,'{}','{}','{}',true,'sih','Same item'
      FROM unnest(ARRAY['cs2','rust','tf2']) game;
    `);
    const readonly = new URL(url); readonly.searchParams.set("options", "-c default_transaction_read_only=on");
    database = new DatabaseService({ enabled: true, databaseUrl: readonly.href });
    health = new IntegrationHealthService(database, loadAppConfig({ NODE_ENV: "test", CATALOG_PUBLIC_GAMES: "cs2,rust,tf2" }));
  });
  beforeEach(async () => {
    await pool.query("UPDATE catalog_products SET public_enabled=true,category_id='rifle'");
    await pool.query("UPDATE supplier_listings SET active=true,available_quantity=1,price_microusd=1000000,last_seen_at=now()");
    await pool.query("UPDATE catalog_sync_runs SET observed_at=now(),finished_at=now()");
  });
  afterAll(async () => { await database.onModuleDestroy(); await pool.end(); });

  it("probes every game and pricing through a connection that rejects all writes", async () => {
    expect((await database.query<{ default_transaction_read_only: string }>("SHOW default_transaction_read_only")).rows[0]?.default_transaction_read_only).toBe("on");
    expect(await health.postgres()).toEqual({ status: "ok" });
    expect(await health.visibleCatalog()).toMatchObject({ status: "ok", total: 3, byGame: { cs2: 1, rust: 1, tf2: 1 } });
    expect(await health.pricing()).toEqual({ status: "ok" });
  });
  it("joins supplier availability by game even when names match", async () => {
    await pool.query("UPDATE supplier_listings SET active=false WHERE game='cs2'");
    expect(await health.catalogGame("cs2")).toMatchObject({ status: "down", total: 1, available: 0 });
    expect(await health.catalogGame("rust")).toMatchObject({ status: "ok", total: 1, available: 1 });
    expect(await health.catalogGame("tf2")).toMatchObject({ status: "ok", total: 1, available: 1 });
  });
  it("does not replace stale observation with a recent completion or another game's run", async () => {
    await pool.query("UPDATE catalog_sync_runs SET observed_at=now()-interval '16 minutes',finished_at=now() WHERE game IN ('rust','tf2')");
    expect(await health.catalogGame("cs2")).toMatchObject({ status: "ok" });
    const result = await health.visibleCatalog();
    expect(result.status).toBe("down");
    expect(result.reasons).toEqual(["CATALOG_RUST_STALE", "CATALOG_TF2_STALE"]);
  });
  it("requires an existing completed supplier snapshot", async () => {
    await pool.query("UPDATE catalog_sync_runs SET finished_at=NULL WHERE game='tf2'");
    expect(await health.catalogGame("tf2")).toMatchObject({ status: "down", reasons: ["CATALOG_TF2_SYNC_MISSING"] });
  });
  it.each([
    ["UPDATE supplier_listings SET last_seen_at=now()-interval '16 minutes' WHERE game='cs2'", "CATALOG_CS2_UNAVAILABLE"],
    ["UPDATE supplier_listings SET available_quantity=0 WHERE game='cs2'", "CATALOG_CS2_UNAVAILABLE"],
    ["UPDATE supplier_listings SET price_microusd=0 WHERE game='cs2'", "CATALOG_CS2_UNAVAILABLE"],
    ["UPDATE catalog_products SET category_id=NULL WHERE game='cs2'", "CATALOG_CS2_UNAVAILABLE"],
    ["UPDATE catalog_products SET public_enabled=false WHERE game='cs2'", "CATALOG_CS2_EMPTY"],
  ])("rejects catalog publication/availability failure %#", async (sql, reason) => {
    await pool.query(sql);
    const result = await health.catalogGame("cs2");
    expect(result.status).toBe("down");
    expect(result.reasons).toContain(reason);
  });
  it("rejects conflicting active pricing rows rather than selecting one as healthy", async () => {
    await pool.query(`INSERT INTO pricing_settings(id,scope,source,supplier_currency,fiat_currency,supplier_to_fiat_rate_minor,coin_rate_numerator,coin_rate_denominator,markup_bps,min_price_coin_minor,round_to_coin_minor,valid_from)
      VALUES ('monitoring-conflict','sih-skins','sih','USD','RUB',9500,2,1,2000,1,1,now())`);
    try { expect(await health.pricing()).toEqual({ status: "down", reasons: ["CATALOG_PRICING_INVALID"] }); }
    finally { await pool.query("DELETE FROM pricing_settings WHERE id='monitoring-conflict'"); }
  });
});
