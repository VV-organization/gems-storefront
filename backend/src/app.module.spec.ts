import { createHash, createHmac } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadAppConfig } from "./config/app-config";
import { APP_CONFIG } from "./config/app-config.module";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppModule } from "./app.module";

describe("AppModule", () => {
  let app: INestApplication;
  let directory: string;
  const secret = "local-monitoring-only-secret";
  let httpServer: Parameters<typeof request>[0];

  beforeAll(async () => {
    directory = mkdtempSync(join(tmpdir(), "gems-monitoring-http-"));
    const file = join(directory, "secret"); writeFileSync(file, secret);
    const config = loadAppConfig({ NODE_ENV: "test", CATALOG_PUBLIC_GAMES: "cs2,rust,tf2", VV_ADMIN_API_ORIGIN: "https://gems.example/api", VV_ADMIN_PUBLIC_ORIGIN: "https://gems.example", VV_ADMIN_INTEGRATION_SECRET_FILE: file });
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).overrideProvider(APP_CONFIG).useValue(config).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    httpServer = app.getHttpServer() as Parameters<typeof request>[0];
  });

  afterAll(async () => {
    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it("mounts the public health boundary", async () => {
    await request(httpServer)
      .get("/health/live")
      .set("x-request-id", "gems:test_request")
      .expect(200, {
        status: "ok",
        service: "gems-api",
      })
      .expect("x-request-id", "gems:test_request");
  });

  it("generates a request id when the caller does not provide one", async () => {
    await request(httpServer)
      .get("/health/live")
      .expect(200)
      .expect("x-request-id", /^[0-9a-f-]{36}$/);
  });

  it("mounts the public VV Admin integration manifest", async () => {
    await request(httpServer)
      .get("/.well-known/vv-admin/manifest.json")
      .expect(200)
      .expect(({body}) => {
        expect(body).toMatchObject({site:{key:"gems"},commerceEvents:{schemaVersion:2}});
        expect(body).not.toHaveProperty("catalog");
        expect(body).toHaveProperty("healthChecks.length", 8);
        expect(body).toHaveProperty("syntheticScenarios", []);
        expect(body).toHaveProperty("actions", []);
        expect(body).toHaveProperty("browserScenarios", { enabled: false });
        expect(body).not.toHaveProperty("storeOrders");
      });
  });

  it("returns a real failing HTTP status when the database is unconfigured", async () => {
    await request(httpServer).get("/admin/integration/health/postgres").expect(503, { status: "down", reasons: ["POSTGRES_UNAVAILABLE"] });
  });

  it("authenticates the public scenario path and returns a write-free refusal", async () => {
    const path = "/admin/integration/scenarios/checkout-payment-reached/run";
    const timestamp = new Date().toISOString();
    const body = { runId: "local-http-test" };
    const digest = createHash("sha256").update(JSON.stringify(body)).digest("hex");
    const signature = createHmac("sha256", secret).update(["POST", `/api${path}`, timestamp, digest].join("\n")).digest("hex");
    await request(httpServer).post(path).send(body).expect(401);
    const response = await request(httpServer).post(path).send(body)
      .set("x-vv-admin-timestamp", timestamp).set("x-vv-admin-signature", signature).expect(200);
    expect(response.body).toMatchObject({ status: "down", error: "PAYMENT_SCENARIO_NOT_AVAILABLE", payment: { reached: false }, syntheticEntities: [], artifacts: [] });
    await request(httpServer).post(path).send({ runId: "tampered" })
      .set("x-vv-admin-timestamp", timestamp).set("x-vv-admin-signature", signature).expect(401);
  });

  it("does not mount excluded customer or admin APIs", async () => {
    for (const path of ["/digital-goods/me", "/admin/integration/catalog/products", "/admin/integration/health/apple-gift-cards"])
      await request(httpServer).get(path).expect(404);
    await request(httpServer).patch("/admin/integration/store-orders/orders/1/processing").send({isProcessed:true}).expect(404);
  });
});
