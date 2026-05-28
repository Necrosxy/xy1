import type { AnswerValue, LastPractice, PracticeState } from "./types";

export const STORAGE_KEY = "omnimedia-practice:v1";

const VERSION = 1 as const;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function createInitialPracticeState(now = new Date()): PracticeState {
  return {
    version: VERSION,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SEVEN_DAYS_MS).toISOString(),
    records: {},
    mistakes: [],
    favorites: []
  };
}

export function getPracticeState(storage: Storage | undefined, now = new Date()): PracticeState {
  if (!storage) {
    return createInitialPracticeState(now);
  }

  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    return persistState(storage, createInitialPracticeState(now));
  }

  try {
    const parsed = JSON.parse(raw) as PracticeState;
    if (!isValidState(parsed) || isExpired(parsed, now)) {
      return resetPracticeState(storage, now);
    }
    return parsed;
  } catch {
    return resetPracticeState(storage, now);
  }
}

export function resetPracticeState(storage: Storage, now = new Date()): PracticeState {
  return persistState(storage, createInitialPracticeState(now));
}

export function markAnswer(
  storage: Storage,
  questionId: string,
  selected: AnswerValue[],
  correct: boolean,
  now = new Date()
): PracticeState {
  const state = getPracticeState(storage, now);
  const previous = state.records[questionId];
  const next: PracticeState = {
    ...state,
    records: {
      ...state.records,
      [questionId]: {
        questionId,
        selected,
        correct,
        answeredAt: now.toISOString(),
        attempts: (previous?.attempts ?? 0) + 1
      }
    },
    mistakes: correct
      ? state.mistakes.filter((id) => id !== questionId)
      : Array.from(new Set([...state.mistakes, questionId]))
  };

  return persistState(storage, next);
}

export function toggleFavorite(storage: Storage, questionId: string, now = new Date()): PracticeState {
  const state = getPracticeState(storage, now);
  const exists = state.favorites.includes(questionId);
  const favorites = exists ? state.favorites.filter((id) => id !== questionId) : [...state.favorites, questionId];

  return persistState(storage, {
    ...state,
    favorites
  });
}

export function setLastPractice(storage: Storage, lastPractice: LastPractice, now = new Date()): PracticeState {
  const state = getPracticeState(storage, now);
  return persistState(storage, {
    ...state,
    lastPractice
  });
}

function persistState(storage: Storage, state: PracticeState): PracticeState {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
  return state;
}

function isExpired(state: PracticeState, now: Date): boolean {
  return new Date(state.expiresAt).getTime() <= now.getTime();
}

function isValidState(value: PracticeState): value is PracticeState {
  return (
    value?.version === VERSION &&
    typeof value.createdAt === "string" &&
    typeof value.expiresAt === "string" &&
    typeof value.records === "object" &&
    Array.isArray(value.mistakes) &&
    Array.isArray(value.favorites)
  );
}
