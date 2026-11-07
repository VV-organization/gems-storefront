import { createHash, createHmac } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { loadAppConfig } from "../../config/app-config";
import { VvAdminScenarioAuthVerifier } from "./vv-admin-scenario-auth";

const path = "/admin/integration/scenarios/checkout-payment-reached/run";
const now = "2026-11-07T12:00:00.000Z";
const body = JSON.stringify({ runId: "local-test" });
const secret = "local-only-shared-secret";
function sign(timestamp: string, publicPath = `/api${path}`, payload = body) {
  return createHmac("sha256", secret).update(["POST", publicPath, timestamp, createHash("sha256").update(payload).digest("hex")].join("\n")).digest("hex");
}
describe("scenario authentication", () => {
  let directory: string;
  let verifier: VvAdminScenarioAuthVerifier;
  beforeAll(() => {
    directory = mkdtempSync(join(tmpdir(), "gems-auth-"));
    const file = join(directory, "secret"); writeFileSync(file, secret);
    verifier = new VvAdminScenarioAuthVerifier(loadAppConfig({ NODE_ENV: "test", VV_ADMIN_API_ORIGIN: "https://gems.example/api", VV_ADMIN_PUBLIC_ORIGIN: "https://gems.example", VV_ADMIN_INTEGRATION_SECRET_FILE: file }));
  });
  afterAll(() => { rmSync(directory, { recursive: true, force: true }); });
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(now)); });
  afterEach(() => { vi.useRealTimers(); });
  it("accepts the public API path and the five-minute window boundaries", () => {
    for (const timestamp of [now, "2026-11-07T11:55:00.000Z", "2026-11-07T12:05:00.000Z"]) {
      expect(verifier.verify({ body, path, timestamp, signature: sign(timestamp) })).toBe(true);
    }
  });
  it.each(["2026-11-07T11:54:59.999Z", "2026-11-07T12:05:00.001Z", "2026-11-07T12:00:00Z", "invalid"])("rejects stale/future/noncanonical timestamp %s", timestamp => {
    expect(verifier.verify({ body, path, timestamp, signature: sign(timestamp) })).toBe(false);
  });
  it("binds the public prefix, body and endpoint", () => {
    expect(verifier.verify({ body, path, timestamp: now, signature: sign(now, path) })).toBe(false);
    expect(verifier.verify({ body: body + " ", path, timestamp: now, signature: sign(now) })).toBe(false);
    expect(verifier.verify({ body, path: path + "-other", timestamp: now, signature: sign(now) })).toBe(false);
  });
  it("rejects an unconfigured secret", () => {
    expect(new VvAdminScenarioAuthVerifier(loadAppConfig({ NODE_ENV: "test" })).verify({ body, path, timestamp: now, signature: sign(now) })).toBe(false);
  });
});
