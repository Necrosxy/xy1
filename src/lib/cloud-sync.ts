import type { AnswerRecord, AnswerValue, LastPractice, PracticeState } from "./types";

export const SYNC_KEY_STORAGE_KEY = "omnimedia-sync-key:v1";

const VERSION = 1 as const;
const PERMANENT_EXPIRES_AT = "9999-12-31T23:59:59.999Z";
const SYNC_KEY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SYNC_KEY_LENGTH = 12;

export function normalizeSyncKey(value: string): string | null {
  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return normalized.length >= 8 ? normalized : null;
}

export function formatSyncKey(value: string): string {
  const normalized = normalizeSyncKey(value) ?? value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return normalized.replace(/(.{4})/g, "$1-").replace(/-$/, "");
}

export function generateSyncKey(getBytes = createRandomBytes): string {
  const bytes = getBytes(SYNC_KEY_LENGTH);
  return Array.from(bytes, (byte) => SYNC_KEY_ALPHABET[byte % SYNC_KEY_ALPHABET.length]).join("");
}

export function isPracticeState(value: unknown): value is PracticeState {
  const state = value as PracticeState;
  return (
    typeof state === "object" &&
    state !== null &&
    state.version === VERSION &&
    typeof state.createdAt === "string" &&
    typeof state.updatedAt === "string" &&
    typeof state.expiresAt === "string" &&
    typeof state.records === "object" &&
    !Array.isArray(state.records) &&
    Array.isArray(state.mistakes) &&
    Array.isArray(state.favorites) &&
    typeof state.answerCorrections === "object" &&
    !Array.isArray(state.answerCorrections)
  );
}

export function mergePracticeStates(
  localState: PracticeState,
  cloudState: PracticeState | null,
  now = new Date()
): PracticeState {
  const updatedAt = now.toISOString();
  if (!cloudState) {
    return {
      ...localState,
      updatedAt,
      mistakes: deriveMistakes(localState.records)
    };
  }

  const newerState = newestState(localState, cloudState);
  const records = mergeRecords(localState.records, cloudState.records);

  return {
    version: VERSION,
    createdAt: earliestIso(localState.createdAt, cloudState.createdAt),
    updatedAt,
    expiresAt: PERMANENT_EXPIRES_AT,
    records,
    mistakes: deriveMistakes(records),
    favorites: [...newerState.favorites],
    answerCorrections: cloneCorrections(newerState.answerCorrections),
    lastPractice: newerState.lastPractice ? { ...newerState.lastPractice } : undefined
  };
}

function mergeRecords(
  localRecords: Record<string, AnswerRecord>,
  cloudRecords: Record<string, AnswerRecord>
): Record<string, AnswerRecord> {
  const merged: Record<string, AnswerRecord> = {};

  for (const [questionId, record] of Object.entries(cloudRecords)) {
    merged[questionId] = cloneRecord(record);
  }

  for (const [questionId, localRecord] of Object.entries(localRecords)) {
    const cloudRecord = merged[questionId];
    merged[questionId] = chooseLatestRecord(localRecord, cloudRecord);
  }

  return merged;
}

function chooseLatestRecord(localRecord: AnswerRecord, cloudRecord: AnswerRecord | undefined): AnswerRecord {
  if (!cloudRecord) return cloneRecord(localRecord);

  const localTime = Date.parse(localRecord.answeredAt);
  const cloudTime = Date.parse(cloudRecord.answeredAt);
  if (localTime > cloudTime) return cloneRecord(localRecord);
  if (cloudTime > localTime) return cloneRecord(cloudRecord);

  return cloneRecord(localRecord.attempts >= cloudRecord.attempts ? localRecord : cloudRecord);
}

function newestState(localState: PracticeState, cloudState: PracticeState): PracticeState {
  return Date.parse(localState.updatedAt) >= Date.parse(cloudState.updatedAt) ? localState : cloudState;
}

function earliestIso(left: string, right: string): string {
  return Date.parse(left) <= Date.parse(right) ? left : right;
}

function deriveMistakes(records: Record<string, AnswerRecord>): string[] {
  return Object.values(records)
    .filter((record) => !record.correct)
    .map((record) => record.questionId);
}

function cloneRecord(record: AnswerRecord): AnswerRecord {
  return {
    ...record,
    selected: [...record.selected]
  };
}

function cloneCorrections(corrections: Record<string, AnswerValue[]>): Record<string, AnswerValue[]> {
  return Object.fromEntries(Object.entries(corrections).map(([questionId, answer]) => [questionId, [...answer]]));
}

function createRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
    return bytes;
  }

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256);
  }
  return bytes;
}
