import { describe, expect, it } from "vitest";

import type { AppConfig } from "../../config/app-config";
import { IntegrationService } from "./integration.service";

const config: AppConfig = {
  nodeEnv: "test",
  port: 3000,
  databaseUrl: "postgres://gems:test@localhost:5432/gems",
  redisUrl: "redis://localhost:6379/0",
  admin: { apiTokenFile: "/run/secrets/admin-token" },
  steam: {},
  arcoPay: { bearerTokenFile: "/run/secrets/token", shopId:"1581", callbackUrl:"https://gems.example/payments/webhooks/arco-pay", paymentOrigin: "https://payment.paidlayer.com",
    apiUrl: "https://api.clickit.team/api/v1",
    environment: "sandbox",
    providerMode: "real",
    apiKeyFile: "/run/secrets/arcoPay",
    publicKeyFile: "/run/secrets/arcoPay-public",
    publicOrigin: "https://hkdk.events/source-id",
  },
  sih: {
    apiKeyFile: "/run/secrets/sih",
    marketBaseUrl: "https://api.sih.market",
    maximumBodyBytes: 4096,
    requestTimeoutMs: 2500,
    steamRefillApiKeyFile: "/run/secrets/sih-steam-refill",
    steamRefillBaseUrl: "https://core.steaminventoryhelper.com",
  },
  catalog: { publicGames: ["cs2", "rust", "tf2"] },
  notifications: {
    smtpHost: "smtp.purelymail.com",
    smtpPort: 465,
    smtpSecure: true,
  },
  integration: {
    publicOrigin: "https://gems.example",
    adminOrigin: "https://api.gems.example",
    vvAdminSiteKey: "gems",
    vvAdminWebhookSiteKey: "gems-webhook-site-key",
    vvAdminWebhookSecretFile: "/run/secrets/vv-admin-integration-secret",
  },
  corsOrigins: [],
};

describe("IntegrationService", () => {
  it("publishes the current VV Admin manifest with CS2 and Steam capabilities", () => {
    const manifest = new IntegrationService(config).manifest();

    expect(manifest).toMatchObject({
      site: {
        key: "gems",
        displayName: "Gems",
        publicOrigin: "https://gems.example",
        adminOrigin: "https://api.gems.example",
        adminAllowedHosts: ["api.gems.example"],
      },
      commerceEvents: {
        schemaVersion: 2,
        delivery: "site_to_vv_admin_webhook",
      },
    });
    expect(manifest).not.toHaveProperty("protocolVersion");
    expect(manifest.healthChecks.map((check) => check.key)).toEqual([
      "backend_http", "frontend_http", "postgres", "redis", "catalog_cs2", "catalog_rust", "catalog_tf2", "catalog_pricing",
    ]);
    expect(manifest.healthChecks.every(check => check.intervalSeconds === 300)).toBe(true);
    expect(manifest.healthChecks.find(check => check.key === "postgres")?.url).toBe("https://api.gems.example/admin/integration/health/postgres");
    expect(manifest).not.toHaveProperty("catalog");
    expect(manifest).not.toHaveProperty("storeOrders");
    expect(manifest).toHaveProperty("browserScenarios", { enabled: false });
    expect(manifest.syntheticScenarios).toEqual([]);
    expect(manifest.actions).toEqual([]);
    expect(JSON.stringify(manifest)).not.toMatch(/secret|token|password/i);
  });

  it("reports readiness from configured dependencies", () => {
    expect(new IntegrationService(config).readiness()).toEqual({
      status: "ok",
      checks: {
        postgres: "ok",
        redis: "ok",
        arcoPay: "ok",
        sih: "ok",
        adminApi: "ok",
      },
    });
  });
});
