import { Inject, Injectable } from "@nestjs/common";
import Redis from "ioredis";

import { DatabaseService } from "../../common/database/database.service";
import type { AppConfig } from "../../config/app-config";
import { isArcoPayConfigured } from "../../config/app-config";
import { APP_CONFIG } from "../../config/app-config.module";
import { type CatalogGame } from "../catalog/catalog-game";

export type IntegrationHealthResult = {
  readonly status: "ok" | "down";
  readonly reasons?: readonly string[];
  readonly total?: number;
  readonly available?: number;
  readonly snapshotAgeSeconds?: number | null;
  readonly byGame?: Partial<Record<CatalogGame, number>>;
};

@Injectable()
export class IntegrationHealthService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async operations(){
    const result=await this.database.query<{orphan_holds:number;aged_unknown:number;stalled_outbox:number;unresolved_payments:number;catalog_age_seconds:number|null}>(`SELECT
      (SELECT count(*)::integer FROM wallet_holds h WHERE h.status='active' AND EXISTS(SELECT 1 FROM order_lines l WHERE l.order_id=h.order_id) AND NOT EXISTS(SELECT 1 FROM order_lines l WHERE l.order_id=h.order_id AND l.status NOT IN ('supplier_finished','supplier_failed'))) AS orphan_holds,
      (SELECT count(*)::integer FROM fulfillment_commands WHERE status IN ('submitted','awaiting_confirmation','manual_review','processing','reconciling') AND created_at<clock_timestamp()-interval '24 hours') AS aged_unknown,
      (SELECT count(*)::integer FROM (
        SELECT status,expires_at,created_at FROM top_up_payments
        UNION ALL SELECT status,expires_at,created_at FROM steam_refill_payments
      ) p WHERE status='manual_review' OR (status IN ('checkout_pending','provider_creation_pending') AND COALESCE(expires_at,created_at+interval '15 minutes')<clock_timestamp()-interval '5 minutes')) AS unresolved_payments,
      ((SELECT count(*) FROM vv_admin_integration_outbox WHERE status<>'accepted' AND created_at<clock_timestamp()-interval '15 minutes')+(SELECT count(*) FROM notification_outbox WHERE status<>'accepted' AND created_at<clock_timestamp()-interval '15 minutes'))::integer AS stalled_outbox,
      (SELECT extract(epoch FROM clock_timestamp()-max(finished_at))::integer FROM catalog_sync_runs WHERE source='sih' AND game='cs2' AND status='promoted') AS catalog_age_seconds`);
    const data=result.rows[0];return {status:data&&(data.orphan_holds+data.aged_unknown+data.stalled_outbox+data.unresolved_payments)===0?'ok':'degraded',...data};
  }
  async postgres(): Promise<IntegrationHealthResult> {
    try {
      await this.database.query("SELECT 1");
      return { status: "ok" };
    } catch (error) {
      return down(error, "POSTGRES_UNAVAILABLE");
    }
  }

  async redis(): Promise<IntegrationHealthResult> {
    if (!this.config.redisUrl) return { status: "down", reasons: ["REDIS_URL_MISSING"] };
    const client = new Redis(this.config.redisUrl, {
      connectTimeout: 2000,
      lazyConnect: true,
      maxRetriesPerRequest: 0,
      commandTimeout: 2000,
      retryStrategy: () => null,
    });
    client.on("error", () => undefined);
    try {
      await client.connect();
      await client.ping();
      return { status: "ok" };
    } catch (error) {
      return down(error, "REDIS_UNAVAILABLE");
    } finally {
      client.disconnect();
    }
  }

  topUp(): IntegrationHealthResult {
    const ok = isArcoPayConfigured(this.config.arcoPay);
    return ok ? { status: "ok" } : { status: "down", reasons: ["ARCO_PAY_TOP_UP_NOT_CONFIGURED"] };
  }

  checkout(): IntegrationHealthResult {
    const ok = Boolean(this.config.databaseUrl && this.config.redisUrl && this.config.arcoPay.publicOrigin);
    return ok ? { status: "ok" } : { status: "down", reasons: ["CHECKOUT_NOT_CONFIGURED"] };
  }

  quoteStorage(): Promise<IntegrationHealthResult> {
    return this.countRows(
      `
        SELECT count(*)::text AS total
        FROM supplier_listings
        WHERE active = true
          AND available_quantity > 0
          AND price_microusd > 0
      `,
      [],
      "QUOTE_STORAGE_EMPTY",
    );
  }

  steamRefill(): IntegrationHealthResult {
    return this.config.sih.steamRefillApiKeyFile
      ? { status: "ok" }
      : { status: "down", reasons: ["SIH_STEAM_REFILL_NOT_CONFIGURED"] };
  }

  async visibleCatalog(): Promise<IntegrationHealthResult> {
    const byGame: Partial<Record<CatalogGame, number>> = {};
    let total = 0;
    const reasons: string[] = [];
    for (const game of this.config.catalog.publicGames) {
      const result = await this.catalogGame(game);
      byGame[game] = result.total ?? 0;
      total += result.total ?? 0;
      if (result.status !== "ok") reasons.push(...(result.reasons ?? []));
    }
    return total > 0 && reasons.length === 0
      ? { status: "ok", total, byGame }
      : { status: "down", total, byGame, reasons: reasons.length ? [...new Set(reasons)] : ["CATALOG_EMPTY"] };
  }

  async catalogGame(game: CatalogGame): Promise<IntegrationHealthResult> {
    const code = `CATALOG_${game.toUpperCase()}`;
    try {
      const result = await this.database.query<{ total: string; available: string; snapshot_age_seconds: number | null }>(`
        SELECT
          count(*)::text AS total,
          count(*) FILTER (WHERE catalog_products.category_id IS NOT NULL
            AND supplier_listings.active AND supplier_listings.available_quantity > 0
            AND supplier_listings.price_microusd > 0
            AND supplier_listings.last_seen_at > clock_timestamp() - interval '15 minutes')::text AS available,
          (SELECT extract(epoch FROM clock_timestamp() - observed_at)::double precision
            FROM catalog_sync_runs
            WHERE source = 'sih' AND game = $1 AND status = 'promoted' AND finished_at IS NOT NULL
            ORDER BY observed_at DESC, finished_at DESC, id DESC LIMIT 1) AS snapshot_age_seconds
        FROM catalog_products
        LEFT JOIN supplier_listings ON catalog_products.supplier_provider = 'sih'
          AND supplier_listings.supplier = 'sih' AND supplier_listings.game = lower(catalog_products.game)
          AND supplier_listings.market_hash_name = catalog_products.supplier_item_id
        WHERE catalog_products.kind = 'skins' AND lower(catalog_products.game) = $1 AND catalog_products.public_enabled = true
      `, [game]);
      const row = result.rows[0];
      const total = Number(row?.total ?? 0);
      const available = Number(row?.available ?? 0);
      const snapshotAgeSeconds = row?.snapshot_age_seconds ?? null;
      const reasons: string[] = [];
      if (total <= 0) reasons.push(`${code}_EMPTY`);
      if (available <= 0) reasons.push(`${code}_UNAVAILABLE`);
      if (snapshotAgeSeconds === null) reasons.push(`${code}_SYNC_MISSING`);
      else if (!Number.isFinite(snapshotAgeSeconds) || snapshotAgeSeconds < 0 || snapshotAgeSeconds >= 900) reasons.push(`${code}_STALE`);
      return { status: reasons.length ? "down" : "ok", total, available, snapshotAgeSeconds, ...(reasons.length ? { reasons } : {}) };
    } catch { return down(null, `${code}_UNAVAILABLE`); }
  }

  async pricing(): Promise<IntegrationHealthResult> {
    try {
      const result = await this.database.query<{
        active_count: string; supplier_currency: string; fiat_currency: string;
        supplier_to_fiat_rate_minor: number; coin_rate_numerator: number; coin_rate_denominator: number;
        markup_bps: number; min_price_coin_minor: number; round_to_coin_minor: number; valid_from: Date;
      }>(`SELECT count(*) OVER ()::text AS active_count, supplier_currency, fiat_currency,
          supplier_to_fiat_rate_minor, coin_rate_numerator, coin_rate_denominator,
          markup_bps, min_price_coin_minor, round_to_coin_minor, valid_from
        FROM pricing_settings WHERE scope = 'sih-skins' AND superseded_at IS NULL
        ORDER BY valid_from DESC, created_at DESC, id DESC LIMIT 1`);
      const setting = result.rows[0];
      if (!setting || Number(setting.active_count) !== 1 || setting.supplier_currency !== "USD" || setting.fiat_currency !== "RUB" ||
        ![setting.supplier_to_fiat_rate_minor, setting.coin_rate_numerator, setting.coin_rate_denominator, setting.round_to_coin_minor].every(value => Number.isSafeInteger(value) && value > 0) ||
        ![setting.markup_bps, setting.min_price_coin_minor].every(value => Number.isSafeInteger(value) && value >= 0) ||
        setting.coin_rate_numerator !== 2 * setting.coin_rate_denominator ||
        !(setting.valid_from instanceof Date) || !Number.isFinite(setting.valid_from.getTime()) || setting.valid_from.getTime() > Date.now()) {
        return down(null, "CATALOG_PRICING_INVALID");
      }
      return { status: "ok" };
    } catch { return down(null, "CATALOG_PRICING_UNAVAILABLE"); }
  }

  private async countRows(
    sql: string,
    params: readonly unknown[],
    emptyReason: string,
  ): Promise<IntegrationHealthResult> {
    try {
      const result = await this.database.query<{ total: string }>(sql, params);
      const total = Number(result.rows[0]?.total ?? "0");
      return total > 0 ? { status: "ok", total } : { status: "down", total, reasons: [emptyReason] };
    } catch (error) {
      return down(error, emptyReason);
    }
  }
}

function down(_error: unknown, fallback: string): IntegrationHealthResult {
  return {
    status: "down",
    reasons: [fallback],
  };
}
