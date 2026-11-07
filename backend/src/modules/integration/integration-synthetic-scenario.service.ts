import { Injectable } from "@nestjs/common";

export type IntegrationSyntheticScenarioResult = {
  readonly status: "healthy" | "down";
  readonly summary: string;
  readonly error: string | null;
  readonly payment: { readonly reached: boolean };
  readonly syntheticEntities: readonly {
    readonly type: string;
    readonly externalId: string;
    readonly cleanupStatus: "retained" | "failed" | "cancelled" | "expired";
  }[];
  readonly steps: readonly Record<string, unknown>[];
  readonly artifacts: readonly Record<string, unknown>[] | null;
  readonly metadata: Record<string, unknown> | null;
};

/** Payment scenarios require a dedicated integration; this legacy route never creates financial records. */
@Injectable()
export class IntegrationSyntheticScenarioService {
  runCheckoutPaymentReached(_input: { readonly runId: string }): Promise<IntegrationSyntheticScenarioResult> {
    void _input;
    return Promise.resolve({
      status: "down",
      summary: "Платёжный сценарий Gems недоступен",
      error: "PAYMENT_SCENARIO_NOT_AVAILABLE",
      payment: { reached: false },
      syntheticEntities: [],
      steps: [],
      artifacts: [],
      metadata: null,
    });
  }
}
