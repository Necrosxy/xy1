import type { AnswerValue, LastPractice, PracticeState } from "./types";
import { normalizeAnswer } from "./question-utils";

export const STORAGE_KEY = "omnimedia-practice:v1";

const VERSION = 1 as const;
const PERMANENT_EXPIRES_AT = "9999-12-31T23:59:59.999Z";

export function createInitialPracticeState(now = new Date()): PracticeState {
  return {
    version: VERSION,
    createdAt: now.toISOString(),
    expiresAt: PERMANENT_EXPIRES_AT,
    records: {},
    mistakes: [],
    favorites: [],
    answerCorrections: {}
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
    const parsed = JSON.parse(raw) as StoredPracticeState;
    if (!isValidState(parsed)) {
      return resetPracticeState(storage, now);
    }
    const migrated = migratePracticeState(parsed);
    if (!parsed.answerCorrections) {
      return persistState(storage, migrated);
    }
    return migrated;
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

export function setAnswerCorrection(
  storage: Storage,
  questionId: string,
  answer: readonly AnswerValue[],
  now = new Date()
): PracticeState {
  const state = getPracticeState(storage, now);
  const correctedAnswer = normalizeAnswer(answer);
  const next = regradeStoredRecord(
    {
      ...state,
      answerCorrections: {
        ...state.answerCorrections,
        [questionId]: correctedAnswer
      }
    },
    questionId,
    correctedAnswer
  );

  return persistState(storage, next);
}

export function clearAnswerCorrection(
  storage: Storage,
  questionId: string,
  originalAnswer: readonly AnswerValue[],
  now = new Date()
): PracticeState {
  const state = getPracticeState(storage, now);
  const { [questionId]: _removed, ...answerCorrections } = state.answerCorrections;
  const next = regradeStoredRecord(
    {
      ...state,
      answerCorrections
    },
    questionId,
    normalizeAnswer(originalAnswer)
  );

  return persistState(storage, next);
}

function persistState(storage: Storage, state: PracticeState): PracticeState {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
  return state;
}

type StoredPracticeState = Omit<PracticeState, "answerCorrections"> & {
  answerCorrections?: Record<string, AnswerValue[]>;
};

function migratePracticeState(state: StoredPracticeState): PracticeState {
  return {
    ...state,
    answerCorrections: state.answerCorrections ?? {}
  };
}

function regradeStoredRecord(
  state: PracticeState,
  questionId: string,
  expectedAnswer: readonly AnswerValue[]
): PracticeState {
  const record = state.records[questionId];
  if (!record) {
    return state;
  }

  const correct = answersEqual(record.selected, expectedAnswer);
  return {
    ...state,
    records: {
      ...state.records,
      [questionId]: {
        ...record,
        correct
      }
    },
    mistakes: correct
      ? state.mistakes.filter((id) => id !== questionId)
      : Array.from(new Set([...state.mistakes, questionId]))
  };
}

function answersEqual(selected: readonly AnswerValue[], expected: readonly AnswerValue[]): boolean {
  const actual = normalizeAnswer(selected);
  const normalizedExpected = normalizeAnswer(expected);
  return (
    actual.length === normalizedExpected.length && actual.every((value, index) => value === normalizedExpected[index])
  );
}

function isValidState(value: StoredPracticeState): value is StoredPracticeState {
  return (
    value?.version === VERSION &&
    typeof value.createdAt === "string" &&
    typeof value.expiresAt === "string" &&
    typeof value.records === "object" &&
    Array.isArray(value.mistakes) &&
    Array.isArray(value.favorites) &&
    (value.answerCorrections === undefined ||
      (typeof value.answerCorrections === "object" && !Array.isArray(value.answerCorrections)))
  );
}
