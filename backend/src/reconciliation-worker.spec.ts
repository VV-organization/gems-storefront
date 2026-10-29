import { describe, expect, it, vi } from "vitest";

import { runReconciliationCycle, watchReconciliation } from "./reconciliation-worker";

describe("reconciliation worker lifecycle", () => {
  it("keeps wallet reconciliation working when payment provider is disabled", async () => {
    const payments = { reconcilePendingTopUps: vi.fn() };
    const wallet = { reconcileWallet: vi.fn().mockResolvedValue({ status: "ok" }) };
    const result = await runReconciliationCycle({ payments, wallet }, false);
    expect(payments.reconcilePendingTopUps).not.toHaveBeenCalled();
    expect(wallet.reconcileWallet).toHaveBeenCalledOnce();
    expect(result).toEqual({ payments: { status: "disabled" }, wallet: { status: "ok" } });
  });

  it("does not skip wallet checking after a real payment reconciliation failure", async () => {
    const result = await runReconciliationCycle({
      payments: { reconcilePendingTopUps: vi.fn().mockRejectedValue(new Error("private provider detail")) },
      wallet: { reconcileWallet: vi.fn().mockResolvedValue({ status: "mismatch" }) },
    }, true);
    expect(result).toEqual({ payments: { status: "error" }, wallet: { status: "mismatch" } });
  });

  it("stops after an active cycle finishes when shutdown is requested", async () => {
    const controller = new AbortController();
    const cycle = vi.fn(() => { controller.abort(); return Promise.resolve(); });
    await watchReconciliation(cycle, controller.signal);
    expect(cycle).toHaveBeenCalledOnce();
  });

  it("interrupts the interval immediately on shutdown", async () => {
    const controller = new AbortController();
    const cycle = vi.fn(() => Promise.resolve());
    const running = watchReconciliation(cycle, controller.signal);
    await vi.waitFor(() => { expect(cycle).toHaveBeenCalledOnce(); });
    controller.abort();
    await running;
    expect(cycle).toHaveBeenCalledOnce();
  });
});
