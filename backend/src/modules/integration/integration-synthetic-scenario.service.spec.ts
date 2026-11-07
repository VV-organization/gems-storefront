import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";
import { loadAppConfig } from "../../config/app-config";
import { APP_CONFIG } from "../../config/app-config.module";
import { IntegrationSyntheticScenarioService } from "./integration-synthetic-scenario.service";

describe("unavailable payment scenario", () => {
  it.each(["disabled", "fake", "real"])("refuses %s provider mode without a payment/database dependency", async mode => {
    const config = loadAppConfig({ NODE_ENV: "test" });
    config.arcoPay.providerMode = mode as "disabled" | "fake" | "real";
    config.commerce = { checkoutEnabled: true, paymentsEnabled: true, fulfillmentEnabled: true };
    const module = await Test.createTestingModule({ providers: [
      IntegrationSyntheticScenarioService, { provide: APP_CONFIG, useValue: config },
    ] }).compile();
    try {
      expect(await module.get(IntegrationSyntheticScenarioService).runCheckoutPaymentReached({ runId: "local-test" })).toMatchObject({
        status: "down", error: "PAYMENT_SCENARIO_NOT_AVAILABLE", payment: { reached: false },
        syntheticEntities: [], artifacts: [],
      });
    } finally { await module.close(); }
  });
});
