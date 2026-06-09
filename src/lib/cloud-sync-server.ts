import { createHash } from "node:crypto";

import { neon } from "@neondatabase/serverless";

import { isPracticeState, mergePracticeStates, normalizeSyncKey } from "./cloud-sync";
import type { PracticeState } from "./types";

let tableReady = false;

type SqlClient = ReturnType<typeof neon<false, false>>;
const BASE_DATABASE_ENV_KEYS = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_URL_NO_SSL",
  "DATABASE_URL_UNPOOLED",
  "DATABASE_URL_UNPOOLED_NO_SSL"
] as const;
const DATABASE_ENV_PREFIXES = ["", "XY_", "xy_"] as const;
export const DATABASE_ENV_KEYS = DATABASE_ENV_PREFIXES.flatMap((prefix) =>
  BASE_DATABASE_ENV_KEYS.map((key) => `${prefix}${key}`)
);
export type DatabaseEnvKey = (typeof DATABASE_ENV_KEYS)[number];

interface SyncResult {
  state: PracticeState;
  created: boolean;
}

export function hashSyncKey(syncKey: string): string {
  const normalized = normalizeSyncKey(syncKey);
  if (!normalized) {
    throw new Error("Invalid sync key");
  }

  return createHash("sha256").update(normalized).digest("hex");
}

export function getConfiguredDatabaseUrl(): string | null {
  return getConfiguredDatabaseEnv()?.url ?? null;
}

export function getConfiguredDatabaseEnv(): { key: DatabaseEnvKey; url: string } | null {
  for (const key of DATABASE_ENV_KEYS) {
    const value = process.env[key]?.trim();
    if (value) return { key, url: value };
  }

  return null;
}

export async function syncPracticeStateWithCloud(syncKey: string, localState: PracticeState): Promise<SyncResult> {
  const databaseUrl = getConfiguredDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL/POSTGRES_URL is not configured");
  }

  const sql = neon(databaseUrl);
  await ensureSyncTable(sql);

  const syncKeyHash = hashSyncKey(syncKey);
  const rows = (await sql`
    SELECT state
    FROM omnimedia_practice_sync
    WHERE sync_key_hash = ${syncKeyHash}
    LIMIT 1
  `) as Array<{ state: unknown }>;

  const cloudState = parseCloudState(rows[0]?.state);
  const mergedState = mergePracticeStates(localState, cloudState, new Date());
  const serializedState = JSON.stringify(mergedState);

  await sql`
    INSERT INTO omnimedia_practice_sync (sync_key_hash, state, updated_at)
    VALUES (${syncKeyHash}, ${serializedState}::jsonb, ${mergedState.updatedAt})
    ON CONFLICT (sync_key_hash)
    DO UPDATE SET
      state = EXCLUDED.state,
      updated_at = EXCLUDED.updated_at
  `;

  return {
    state: mergedState,
    created: !cloudState
  };
}

async function ensureSyncTable(sql: SqlClient) {
  if (tableReady) return;

  await sql`
    CREATE TABLE IF NOT EXISTS omnimedia_practice_sync (
      sync_key_hash text PRIMARY KEY,
      state jsonb NOT NULL,
      updated_at timestamptz NOT NULL
    )
  `;

  tableReady = true;
}

function parseCloudState(value: unknown): PracticeState | null {
  if (isPracticeState(value)) return value;
  if (typeof value !== "string") return null;

  try {
    const parsed = JSON.parse(value) as unknown;
    return isPracticeState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
