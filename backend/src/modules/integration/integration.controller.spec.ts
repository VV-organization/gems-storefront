import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { IntegrationController } from "./integration.controller";

describe("IntegrationController synthetic scenario endpoint", () => {
  it("runs checkout-payment-reached when the signed request is valid", async () => {
    const scenario = {
      runCheckoutPaymentReached: vi.fn().mockResolvedValue({ status: "healthy" }),
    };
    const verifier = { verify: vi.fn().mockReturnValue(true) };
    const controller = createController({ scenario, verifier });

    await expect(
      controller.runCheckoutPaymentReached(
        { runId: "run-1" },
      {
        "x-vv-admin-signature": "test-signature",
        "x-vv-admin-timestamp": "2026-08-13T12:00:00.000Z",
      },
      ),
    ).resolves.toEqual({ status: "healthy" });
    expect(scenario.runCheckoutPaymentReached).toHaveBeenCalledWith({
      runId: "run-1",
    });
  });

  it("rejects missing run id", async () => {
    const controller = createController({ scenario: {
      runCheckoutPaymentReached: vi.fn(),
    }, verifier: { verify: vi.fn().mockReturnValue(true) } });

    await expect(
      controller.runCheckoutPaymentReached({}, {
        "x-vv-admin-signature": "test-signature",
        "x-vv-admin-timestamp": "2026-08-13T12:00:00.000Z",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects unsigned requests", async () => {
    const controller = createController({ scenario: {
      runCheckoutPaymentReached: vi.fn(),
    }, verifier: { verify: vi.fn().mockReturnValue(false) } });

    await expect(
      controller.runCheckoutPaymentReached({ runId: "run-1" }, {}),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

function createController(input: { scenario: unknown; verifier: unknown }): IntegrationController {
  return new IntegrationController(
    {} as never,
    input.scenario as never,
    input.verifier as never,
    {} as never,
  );
}

it.each(['cs2','rust','tf2'])('exposes authenticated catalog health for %s',async(game)=>{
 const health={catalogGame:vi.fn().mockResolvedValue({status:'ok'})};
 const controller=new IntegrationController({} as never,{} as never,{} as never,health as never);
 await expect(controller.catalogGameHealth(game,{status:vi.fn()} as never)).resolves.toEqual({status:'ok'});
 expect(health.catalogGame).toHaveBeenCalledWith(game);
});

 it("returns HTTP 503 for PostgreSQL failure", async () => {
   const controller = new IntegrationController({} as never, {} as never, {} as never, {
     postgres: () => Promise.resolve({ status: "down", reasons: ["POSTGRES_UNAVAILABLE"] }),
   } as never);
   const response = { status: vi.fn() };
   expect(await controller.postgresHealth(response as never)).toEqual({ status: "down", reasons: ["POSTGRES_UNAVAILABLE"] });
   expect(response.status).toHaveBeenCalledWith(503);
 });
 it("returns HTTP 503 for invalid pricing", async () => {
   const controller = new IntegrationController({} as never, {} as never, {} as never, {
     pricing: () => Promise.resolve({ status: "down", reasons: ["CATALOG_PRICING_INVALID"] }),
   } as never);
   const response = { status: vi.fn() };
   expect(await controller.pricingHealth(response as never)).toEqual({ status: "down", reasons: ["CATALOG_PRICING_INVALID"] });
   expect(response.status).toHaveBeenCalledWith(503);
 });
 it.each(["", "../unsafe", "a".repeat(101), " space "])("rejects invalid scenario runId %s", async runId => {
   const controller = createController({ scenario: { runCheckoutPaymentReached: vi.fn() }, verifier: { verify: () => true } });
   await expect(controller.runCheckoutPaymentReached({ runId }, { "x-vv-admin-signature": "signature", "x-vv-admin-timestamp": "timestamp" })).rejects.toBeInstanceOf(BadRequestException);
 });
