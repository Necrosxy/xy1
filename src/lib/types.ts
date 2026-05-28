export type QuestionType = "judge" | "single" | "multiple";

export type AnswerValue = "true" | "false" | "A" | "B" | "C" | "D" | "E";

export interface QuestionOption {
  key: Exclude<AnswerValue, "true" | "false">;
  text: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  number: number;
  stem: string;
  options: QuestionOption[];
  answer: AnswerValue[];
  sourcePage: number;
}

export interface AnswerRecord {
  questionId: string;
  selected: AnswerValue[];
  correct: boolean;
  answeredAt: string;
  attempts: number;
}

export interface LastPractice {
  type: QuestionType | "mixed" | "mistakes";
  mode: "ordered" | "random";
  questionId?: string;
}

export interface PracticeState {
  version: 1;
  createdAt: string;
  expiresAt: string;
  records: Record<string, AnswerRecord>;
  mistakes: string[];
  favorites: string[];
  lastPractice?: LastPractice;
}

export interface RecordSummary {
  answered: number;
  correct: number;
  mistakes: number;
  accuracy: number;
}
