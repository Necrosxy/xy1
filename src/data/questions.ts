import bank from "./question-bank.json";

import type { Question, QuestionType } from "@/lib/types";

export type PracticeScope = QuestionType | "mixed";

export interface QuestionBank {
  title: string;
  counts: Record<QuestionType, number>;
  total: number;
  questions: Question[];
}

export const questionBank = bank as QuestionBank;

export const allQuestions = questionBank.questions;

export function questionsForScope(scope: PracticeScope): Question[] {
  if (scope === "mixed") {
    return allQuestions;
  }
  return allQuestions.filter((question) => question.type === scope);
}

export function findQuestion(questionId: string): Question | undefined {
  return allQuestions.find((question) => question.id === questionId);
}

export function shuffleQuestions(questions: Question[]): Question[] {
  const copy = [...questions];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}
