import { readFileSync } from "node:fs";

import { defineConfig } from "drizzle-kit";

function optionalString(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function optionalStringFromFile(path: string | undefined): string | undefined {
  const normalizedPath = optionalString(path);
  if (normalizedPath === undefined) return undefined;
  return optionalString(readFileSync(normalizedPath, "utf8"));
}

const databaseUrl =
  optionalString(process.env.DATABASE_URL) ??
  optionalStringFromFile(process.env.DATABASE_URL_FILE);

if (!databaseUrl && process.env.NODE_ENV === "production") {
  throw new Error("DATABASE_URL is required in production.");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl ?? "postgres://gems:gems_local_only@127.0.0.1:55461/gems",
  },
  strict: true,
  verbose: true,
});
