import type { AnswerRecord, AnswerValue, PracticeState, Question, RecordSummary } from "../../src/lib/types";

export const STORAGE_KEY: string;
export function createInitialPracticeState(now?: Date): PracticeState;
export function gradeQuestion(question: Pick<Question, "answer">, selected: AnswerValue[]): boolean;
export function isExpired(state: PracticeState | null | undefined, now?: Date): boolean;
export function markAnswer(
  state: PracticeState,
  questionId: string,
  selected: AnswerValue[],
  correct: boolean,
  now?: Date
): PracticeState;
export function normalizeAnswer(answer: string | AnswerValue[]): AnswerValue[];
export function summarizeRecords(records: Record<string, AnswerRecord>): RecordSummary;
export function toggleFavorite(state: PracticeState, questionId: string): PracticeState;
