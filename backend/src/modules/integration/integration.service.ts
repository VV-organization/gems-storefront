import { Inject, Injectable } from "@nestjs/common";

import type { AppConfig } from "../../config/app-config";
import { isArcoPayConfigured } from "../../config/app-config";
import { APP_CONFIG } from "../../config/app-config.module";

type IntegrationManifest = {
  readonly site: { readonly key: string; readonly displayName: "Gems"; readonly publicOrigin: string; readonly adminOrigin: string; readonly adminAllowedHosts: readonly string[] };
  readonly commerceEvents: { readonly schemaVersion: 2; readonly delivery: "site_to_vv_admin_webhook" };
  readonly browserScenarios: { readonly enabled: false };
  readonly healthChecks: readonly {
    readonly key: string; readonly label: string; readonly kind: "http_status";
    readonly method: "GET"; readonly url: string; readonly timeoutMs: number; readonly intervalSeconds: number;
  }[];
  readonly syntheticScenarios: readonly never[];
  readonly actions: readonly never[];
};

type IntegrationReadiness = {
  readonly status: "ok" | "degraded";
  readonly checks: {
    readonly postgres: "ok" | "not_configured";
    readonly redis: "ok" | "not_configured";
    readonly arcoPay: "ok" | "not_configured";
    readonly sih: "ok" | "not_configured";
    readonly adminApi: "ok" | "not_configured";
  };
};

@Injectable()
export class IntegrationService {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  manifest(): IntegrationManifest {
    const { publicOrigin, adminOrigin } = this.config.integration;
    const check = (key: string, label: string, url: string, timeoutMs = 5000) => ({
      key, label, kind: "http_status" as const, method: "GET" as const, url, timeoutMs, intervalSeconds: 300,
    });
    return {
      site: { key: this.config.integration.vvAdminSiteKey ?? "gems", displayName: "Gems", publicOrigin, adminOrigin, adminAllowedHosts: [new URL(adminOrigin).hostname] },
      commerceEvents: { schemaVersion: 2, delivery: "site_to_vv_admin_webhook" },
      browserScenarios: { enabled: false },
      healthChecks: [
        check("backend_http", "Backend", `${adminOrigin}/health/live`),
        check("frontend_http", "Frontend", `${publicOrigin}/`),
        check("postgres", "База данных", `${adminOrigin}/admin/integration/health/postgres`),
        check("redis", "Redis", `${adminOrigin}/admin/integration/health/redis`),
        ...this.config.catalog.publicGames.map(game => check(`catalog_${game}`, `Каталог ${game.toUpperCase()}`, `${adminOrigin}/admin/integration/health/catalog/${game}`, 10000)),
        check("catalog_pricing", "Настройки цены Gems", `${adminOrigin}/admin/integration/health/pricing`),
      ],
      syntheticScenarios: [],
      actions: [],
    };
  }

  readiness(): IntegrationReadiness {
    const checks = {
      postgres: this.config.databaseUrl ? "ok" : "not_configured",
      redis: this.config.redisUrl ? "ok" : "not_configured",
      arcoPay:
        isArcoPayConfigured(this.config.arcoPay)
          ? "ok"
          : "not_configured",
      sih:
        this.config.sih.apiKeyFile && this.config.sih.steamRefillApiKeyFile
          ? "ok"
          : "not_configured",
      adminApi: this.config.admin.apiTokenFile ? "ok" : "not_configured",
    } as const;
    return {
      status: Object.values(checks).every((status) => status === "ok")
        ? "ok"
        : "degraded",
      checks,
    };
  }
}
