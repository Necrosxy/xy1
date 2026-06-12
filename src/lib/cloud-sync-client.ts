"use client";

import { normalizeSyncKey, SYNC_KEY_STORAGE_KEY } from "./cloud-sync";
import type { PracticeState } from "./types";

export interface CloudSyncError extends Error {
  code?: string;
}

export interface CloudSyncResult {
  state: PracticeState;
  meta?: {
    localRecordCount: number;
    cloudRecordCount: number;
    mergedRecordCount: number;
    localUpdatedAt: string;
    cloudUpdatedAt: string | null;
    mergedUpdatedAt: string;
  };
}

export async function syncPracticeStateToCloud(syncKey: string, state: PracticeState): Promise<PracticeState> {
  return (await syncPracticeStateToCloudWithMeta(syncKey, state)).state;
}

export async function syncPracticeStateToCloudWithMeta(syncKey: string, state: PracticeState): Promise<CloudSyncResult> {
  const normalized = normalizeSyncKey(syncKey);
  if (!normalized) {
    throw createCloudSyncError("同步码无效");
  }

  const response = await fetch("/api/sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      syncKey: normalized,
      state
    })
  });
  const payload = (await response.json().catch(() => ({}))) as {
    code?: string;
    error?: string;
    meta?: CloudSyncResult["meta"];
    state?: PracticeState;
  };

  if (!response.ok || !payload.state) {
    throw createCloudSyncError(payload.error ?? "同步失败", payload.code);
  }

  return {
    state: payload.state,
    meta: payload.meta
  };
}

export function readStoredSyncKey(storage: Storage): string | null {
  const storedKey = storage.getItem(SYNC_KEY_STORAGE_KEY);
  return storedKey ? normalizeSyncKey(storedKey) : null;
}

function createCloudSyncError(message: string, code?: string): CloudSyncError {
  const error = new Error(message) as CloudSyncError;
  error.code = code;
  return error;
}
