import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const secretNames = [
  "STEAM_WEB_API_KEY", "SIH_API_KEY", "SIH_STEAM_REFILL_API_KEY",
  "ARCO_PAY_API_KEY", "ARCO_PAY_BEARER_TOKEN", "ARCO_PAY_PUBLIC_KEY",
  "PURELYMAIL_SMTP_PASSWORD", "VV_ADMIN_WEBHOOK_SECRET", "VV_ADMIN_INTEGRATION_SECRET",
  "ADMIN_API_TOKEN", "SLACK_ORDERS_WEBHOOK_URL",
] as const;

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

/** Adapt runtime env to the application's file interfaces; never print secret values. */
export async function prepareRuntimeSecrets(env: NodeJS.ProcessEnv): Promise<string> {
  for (const name of secretNames) {
    if (env[name]?.trim() && env[`${name}_FILE`]?.trim()) {
      throw new Error(`RUNTIME_SECRET_CONFLICT: ${name}`);
    }
  }
  const directory = await mkdtemp(join(tmpdir(), "gems-runtime-secrets-"));
  try {
    const exports: string[] = [];
    for (const name of secretNames) {
      const value = env[name];
      if (!value?.trim()) continue;
      const path = join(directory, name);
      await writeFile(path, value, { mode: 0o600, flag: "wx" });
      exports.push(`export ${name}_FILE=${shellQuote(path)}\nunset ${name}\n`);
    }
    await writeFile(join(directory, "environment"), exports.join(""), { mode: 0o600, flag: "wx" });
    return directory;
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}

if (require.main === module) {
  prepareRuntimeSecrets(process.env).then(
    (directory) => process.stdout.write(`${directory}\n`),
    () => { process.stderr.write("RUNTIME_SECRETS_PREPARATION_FAILED\n"); process.exitCode = 1; },
  );
}
