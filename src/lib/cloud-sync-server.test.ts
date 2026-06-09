import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { getConfiguredDatabaseEnv, getConfiguredDatabaseUrl, hashSyncKey } from "./cloud-sync-server";

const root = path.resolve(__dirname, "../..");
const originalDatabaseUrl = process.env.DATABASE_URL;
const originalPostgresUrl = process.env.POSTGRES_URL;
const originalPostgresPrismaUrl = process.env.POSTGRES_PRISMA_URL;

describe("cloud sync server wiring", () => {
  afterEach(() => {
    process.env.DATABASE_URL = originalDatabaseUrl;
    process.env.POSTGRES_URL = originalPostgresUrl;
    process.env.POSTGRES_PRISMA_URL = originalPostgresPrismaUrl;
  });

  it("hashes sync keys before storing them", () => {
    expect(hashSyncKey("ABCD1234EFGH")).toMatch(/^[a-f0-9]{64}$/);
    expect(hashSyncKey("ABCD1234EFGH")).toBe(hashSyncKey("abcd-1234-efgh"));
  });

  it("accepts Vercel/Neon Postgres environment variable names", () => {
    delete process.env.DATABASE_URL;
    process.env.POSTGRES_URL = "postgresql://postgres-url";
    process.env.POSTGRES_PRISMA_URL = "postgresql://prisma-url";

    expect(getConfiguredDatabaseUrl()).toBe("postgresql://postgres-url");
    expect(getConfiguredDatabaseEnv()).toEqual({ key: "POSTGRES_URL", url: "postgresql://postgres-url" });

    process.env.DATABASE_URL = "postgresql://database-url";
    expect(getConfiguredDatabaseUrl()).toBe("postgresql://database-url");
    expect(getConfiguredDatabaseEnv()).toEqual({ key: "DATABASE_URL", url: "postgresql://database-url" });
  });

  it("exposes a node runtime API route for Neon sync", () => {
    const route = fs.readFileSync(path.join(root, "src/app/api/sync/route.ts"), "utf8");

    expect(route).toContain('runtime = "nodejs"');
    expect(route).toContain("syncPracticeStateWithCloud");
    expect(route).toContain("DATABASE_URL");
    expect(route).toContain("POSTGRES_URL");
    expect(route).toContain("DATABASE_ENV_MISSING");
    expect(route).toContain("databaseEnvKey");
  });
});
