import "reflect-metadata";

import { setTimeout as delay } from "node:timers/promises";

import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { loadAppConfig } from "./config/app-config";
import { PaymentsService } from "./modules/payments/payments.service";
import { WalletService } from "./modules/wallet/wallet.service";

type ReconciliationDependencies = {
  payments: { reconcilePendingTopUps(): Promise<unknown> };
  wallet: { reconcileWallet(): Promise<unknown> };
};

export async function runReconciliationCycle(
  dependencies: ReconciliationDependencies,
  paymentsEnabled: boolean,
): Promise<{ payments: unknown; wallet: unknown }> {
  const [payments, wallet] = await Promise.allSettled([
    paymentsEnabled ? dependencies.payments.reconcilePendingTopUps() : Promise.resolve({ status: "disabled" }),
    dependencies.wallet.reconcileWallet(),
  ]);
  return {
    payments: payments.status === "fulfilled" ? payments.value : { status: "error" },
    wallet: wallet.status === "fulfilled" ? wallet.value : { status: "error" },
  };
}

export async function watchReconciliation(cycle: () => Promise<void>, signal: AbortSignal): Promise<void> {
  const isStopped = (): boolean => signal.aborted;
  while (!isStopped()) {
    await cycle();
    if (isStopped()) break;
    try {
      await delay(30_000, undefined, { signal });
    } catch (error) {
      if (!isStopped()) throw error;
    }
  }
}

async function main(): Promise<void> {
  const config = loadAppConfig(process.env);
  const controller = new AbortController();
  const stop = (): void => { controller.abort(); };
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ["error", "warn"] });
  try {
    const dependencies = { payments: app.get(PaymentsService), wallet: app.get(WalletService) };
    await watchReconciliation(async () => {
      const result = await runReconciliationCycle(dependencies, config.arcoPay.providerMode === "real");
      process.stdout.write(`${JSON.stringify({ at: new Date().toISOString(), event: "reconciliation", ...result })}\n`);
    }, controller.signal);
  } finally {
    await app.close();
    process.removeListener("SIGTERM", stop);
    process.removeListener("SIGINT", stop);
  }
}

if (require.main === module) {
  main().catch(() => { process.stderr.write("RECONCILIATION_WORKER_FAILED\n"); process.exitCode = 1; });
}
