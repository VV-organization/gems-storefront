import { Inject, Injectable } from "@nestjs/common";
import type { AppConfig } from "../../config/app-config";
import { APP_CONFIG } from "../../config/app-config.module";
import { PaymentsService, type TopUpSessionDto } from "../payments/payments.service";
import { SCENARIO_USER_ID, SCENARIO_COIN_MINOR, ScenarioPaymentBlocked } from "../payments/synthetic-top-up";
import { scenarioAvailable } from "./integration.service";

function result(error: string, summary: string, merchantOrderId?: string, providerCode?: string | null) {
  return {
    status: "down", error, summary, payment: { reached: false }, steps: [], artifacts: [],
    syntheticEntities: merchantOrderId ? [{ type: "top_up", externalId: merchantOrderId, cleanupStatus: "retained" }] : [],
    metadata: merchantOrderId ? { merchantOrderId, providerCode: providerCode ?? null } : null,
  };
}

@Injectable()
export class IntegrationSyntheticScenarioService {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(PaymentsService) private readonly payments: Pick<PaymentsService, "createTopUpSession">,
  ) {}

  async runCheckoutPaymentReached({runId}: {readonly runId: string}) {
    if (!scenarioAvailable(this.config)) return result("PAYMENT_SCENARIO_NOT_AVAILABLE", "Платёжный сценарий Gems недоступен");
    let payment: TopUpSessionDto;
    try {
      payment = await this.payments.createTopUpSession({
        userId: SCENARIO_USER_ID, idempotencyKey: `vv-admin-synthetic-${runId}`, coinAmountMinor: SCENARIO_COIN_MINOR,
      });
    } catch (error) {
      if (error instanceof ScenarioPaymentBlocked) {
        const reason = `Требуется сверка счёта ${error.merchantOrderId}${error.providerCode ? " · " + error.providerCode : ""}`;
        return {...result(reason, reason, error.merchantOrderId, error.providerCode),
          metadata: {merchantOrderId: error.merchantOrderId, providerCode: error.providerCode, reasonCode: error.message}};
      }
      return result("SCENARIO_PAYMENT_CREATE_FAILED", "Не удалось создать тестовый счёт Gems");
    }
    if (payment.status !== "checkout_pending" || !payment.checkoutUrl) {
      return result("SCENARIO_PAYMENT_NOT_PENDING", `Состояние тестового счёта: ${payment.status}`, payment.id);
    }
    const action = URL.canParse(payment.checkoutUrl) ? new URL(payment.checkoutUrl) : null;
    if (!action || action.origin !== "https://payment.clickit.team" || action.username || action.password ||
        action.search || action.hash || !/^\/[A-Za-z0-9_-]{1,128}$/.test(action.pathname)) {
      return result("SCENARIO_PAYMENT_HANDOFF_INVALID", "Некорректная ссылка на форму Clickit", payment.id);
    }
    const success = new URL("/payments/return", this.config.integration.publicOrigin);
    success.searchParams.set("session", payment.id);
    success.searchParams.set("payment", "success");
    const fail = new URL(success);
    fail.searchParams.set("payment", "failed");
    return {
      ...result("BROWSER_PAYMENT_REQUIRED", "Ожидается загрузка формы Clickit", payment.id),
      browserPayment: {method: "POST", topUpId: payment.id, action: action.href, successUrl: success.href, failUrl: fail.href},
    };
  }
}
