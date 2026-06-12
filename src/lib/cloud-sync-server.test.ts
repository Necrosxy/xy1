import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { getConfiguredDatabaseEnv, getConfiguredDatabaseUrl, hashSyncKey } from "./cloud-sync-server";

const root = path.resolve(__dirname, "../..");
const originalDatabaseUrl = process.env.DATABASE_URL;
const originalPostgresUrl = process.env.POSTGRES_URL;
const originalPostgresPrismaUrl = process.env.POSTGRES_PRISMA_URL;
const originalPostgresNonPoolingUrl = process.env.POSTGRES_URL_NON_POOLING;
const originalDatabaseUnpooledUrl = process.env.DATABASE_URL_UNPOOLED;
const originalPrefixedDatabaseUrl = process.env.XY_DATABASE_URL;
const originalLowerPrefixedDatabaseUrl = process.env.xy_DATABASE_URL;

describe("cloud sync server wiring", () => {
  afterEach(() => {
    process.env.DATABASE_URL = originalDatabaseUrl;
    process.env.POSTGRES_URL = originalPostgresUrl;
    process.env.POSTGRES_PRISMA_URL = originalPostgresPrismaUrl;
    process.env.POSTGRES_URL_NON_POOLING = originalPostgresNonPoolingUrl;
    process.env.DATABASE_URL_UNPOOLED = originalDatabaseUnpooledUrl;
    process.env.XY_DATABASE_URL = originalPrefixedDatabaseUrl;
    process.env.xy_DATABASE_URL = originalLowerPrefixedDatabaseUrl;
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

  it("falls back to unpooled Neon connection URLs when pooled URLs are absent", () => {
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_URL;
    delete process.env.POSTGRES_PRISMA_URL;
    process.env.POSTGRES_URL_NON_POOLING = "postgresql://postgres-non-pooling";
    process.env.DATABASE_URL_UNPOOLED = "postgresql://database-unpooled";

    expect(getConfiguredDatabaseUrl()).toBe("postgresql://postgres-non-pooling");
    expect(getConfiguredDatabaseEnv()).toEqual({
      key: "POSTGRES_URL_NON_POOLING",
      url: "postgresql://postgres-non-pooling"
    });
  });

  it("accepts xy-prefixed database environment variables", () => {
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_URL;
    delete process.env.POSTGRES_PRISMA_URL;
    delete process.env.POSTGRES_URL_NON_POOLING;
    delete process.env.DATABASE_URL_UNPOOLED;
    process.env.XY_DATABASE_URL = "postgresql://prefixed-database-url";

    expect(getConfiguredDatabaseUrl()).toBe("postgresql://prefixed-database-url");
    expect(getConfiguredDatabaseEnv()).toEqual({
      key: "XY_DATABASE_URL",
      url: "postgresql://prefixed-database-url"
    });

    delete process.env.XY_DATABASE_URL;
    process.env.xy_DATABASE_URL = "postgresql://lower-prefixed-database-url";
    expect(getConfiguredDatabaseEnv()).toEqual({
      key: "xy_DATABASE_URL",
      url: "postgresql://lower-prefixed-database-url"
    });
  });

  it("exposes a node runtime API route for Neon sync", () => {
    const route = fs.readFileSync(path.join(root, "src/app/api/sync/route.ts"), "utf8");

    expect(route).toContain('runtime = "nodejs"');
    expect(route).toContain("syncPracticeStateWithCloud");
    expect(route).toContain("DATABASE_URL");
    expect(route).toContain("POSTGRES_URL");
    expect(route).toContain("DATABASE_ENV_MISSING");
    expect(route).toContain("databaseEnvKey");
    expect(fs.readFileSync(path.join(root, "src/lib/cloud-sync-server.ts"), "utf8")).toContain("mergedRecordCount");
  });
});
