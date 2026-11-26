import { describe, expect, it, vi } from "vitest";
import { loadAppConfig } from "../../config/app-config";
import type { TopUpSessionDto } from "../payments/payments.service";
import { IntegrationSyntheticScenarioService } from "./integration-synthetic-scenario.service";

function fixture() {
  const config = loadAppConfig({NODE_ENV: "test", GEMS_PAYMENTS_ENABLED: "true", VV_ADMIN_PUBLIC_ORIGIN: "https://gems.example",
    VV_ADMIN_INTEGRATION_SECRET_FILE: "/test/scenario", ARCO_PAY_PROVIDER_MODE: "real", ARCO_PAY_SHOP_ID: "1724",
    ARCO_PAY_PUBLIC_ORIGIN: "https://gems.example", ARCO_PAY_CALLBACK_URL: "https://gems.example/api/callback",
    ARCO_PAY_API_KEY_FILE: "/test/key", ARCO_PAY_BEARER_TOKEN_FILE: "/test/bearer", ARCO_PAY_PUBLIC_KEY_FILE: "/test/public"});
  const createTopUpSession = vi.fn().mockResolvedValue({ id: "merchant-id", status: "checkout_pending",
    checkoutUrl: "https://payment.clickit.team/order-id" } satisfies Partial<TopUpSessionDto>);
  return {config, createTopUpSession, service: new IntegrationSyntheticScenarioService(config, {createTopUpSession})};
}

describe("Gems payment scenario", () => {
  it("hands a transient Clickit form to the worker without reporting success", async () => {
    const {service, createTopUpSession} = fixture();
    const response = await service.runCheckoutPaymentReached({runId: "test-run"});
    expect(createTopUpSession).toHaveBeenCalledWith({userId: "synthetic:vv-admin", idempotencyKey: "vv-admin-synthetic-test-run", coinAmountMinor: 10000});
    expect(response).toMatchObject({error: "BROWSER_PAYMENT_REQUIRED", payment: {reached: false}, browserPayment: {
      method: "POST", paymentMethod: "sbp", topUpId: "merchant-id", action: "https://payment.clickit.team/order-id",
      successUrl: "https://gems.example/payments/return?session=merchant-id&payment=success",
    }});
  });

  it("requires dedicated signing credentials before requesting a payment", async () => {
    const {config, service, createTopUpSession} = fixture();
    delete config.integration.protocolAuthSecretFile;
    expect(await service.runCheckoutPaymentReached({runId: "test"})).toMatchObject({error: "PAYMENT_SCENARIO_NOT_AVAILABLE"});
    expect(createTopUpSession).not.toHaveBeenCalled();
  });

  it("rejects an unexpected payment origin", async () => {
    const {service, createTopUpSession} = fixture();
    createTopUpSession.mockResolvedValue({id: "test", status: "checkout_pending", checkoutUrl: "https://elsewhere.example/order"});
    expect(await service.runCheckoutPaymentReached({runId: "test"})).toMatchObject({error: "SCENARIO_PAYMENT_HANDOFF_INVALID", payment: {reached: false}});
  });
});
