import { execFileSync } from "node:child_process";
import { readFile, rm, stat } from "node:fs/promises";

import { afterEach, describe, expect, it } from "vitest";

import { prepareRuntimeSecrets } from "./runtime-secrets";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("container runtime secrets", () => {
  it("preserves special characters and multiline keys without exposing plaintext in shell exports", async () => {
    const value = "first '\" $HOME $(exit 91) `exit 92`\nsecond line";
    const directory = await prepareRuntimeSecrets({ SIH_API_KEY: value, ARCO_PAY_PUBLIC_KEY: value });
    directories.push(directory);
    expect(await readFile(`${directory}/SIH_API_KEY`, "utf8")).toBe(value);
    expect(await readFile(`${directory}/ARCO_PAY_PUBLIC_KEY`, "utf8")).toBe(value);
    expect((await stat(directory)).mode & 0o777).toBe(0o700);
    expect((await stat(`${directory}/SIH_API_KEY`)).mode & 0o777).toBe(0o600);
    expect((await stat(`${directory}/environment`)).mode & 0o777).toBe(0o600);
    const exports = await readFile(`${directory}/environment`, "utf8");
    expect(exports).not.toContain(value);
    const result = execFileSync("sh", ["-c", '. "$1/environment"; test -z "${SIH_API_KEY+x}"; cat "$SIH_API_KEY_FILE"', "sh", directory], {
      env: { ...process.env, SIH_API_KEY: value }, encoding: "utf8",
    });
    expect(result).toBe(value);
  });

  it("supports all provider file interfaces and removes direct secrets from the application environment", async () => {
    const names = ["STEAM_WEB_API_KEY", "SIH_API_KEY", "SIH_STEAM_REFILL_API_KEY", "ARCO_PAY_API_KEY", "ARCO_PAY_BEARER_TOKEN", "ARCO_PAY_PUBLIC_KEY", "PURELYMAIL_SMTP_PASSWORD", "VV_ADMIN_WEBHOOK_SECRET", "VV_ADMIN_INTEGRATION_SECRET", "ADMIN_API_TOKEN", "SLACK_ORDERS_WEBHOOK_URL"];
    const env = Object.fromEntries(names.map((name) => [name, `secret-for-${name}`]));
    const directory = await prepareRuntimeSecrets(env);
    directories.push(directory);
    for (const name of names) {
      expect(await readFile(`${directory}/${name}`, "utf8")).toBe(env[name]);
    }
    const output = execFileSync("sh", ["-c", '. "$1/environment"; env', "sh", directory], { env, encoding: "utf8" });
    for (const name of names) {
      expect(output).not.toContain(`${name}=`);
      expect(output).toContain(`${name}_FILE=${directory}/${name}`);
    }
  });

  it("preserves existing file configuration and ignores empty optional secrets", async () => {
    const directory = await prepareRuntimeSecrets({ SIH_API_KEY: "", SIH_API_KEY_FILE: "/run/existing-key", OTHER_ENV: "value" });
    directories.push(directory);
    expect(await readFile(`${directory}/environment`, "utf8")).toBe("");
  });

  it("rejects conflicting inline/file secrets without including their values in the error", async () => {
    await expect(prepareRuntimeSecrets({ SIH_API_KEY: "private-value", SIH_API_KEY_FILE: "/private-path" }))
      .rejects.toThrow(/^RUNTIME_SECRET_CONFLICT: SIH_API_KEY$/);
  });
});
