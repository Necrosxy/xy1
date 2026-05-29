import type { AnswerRecord, AnswerValue, Question, QuestionType, RecordSummary } from "./types";

const ANSWER_ORDER: AnswerValue[] = ["A", "B", "C", "D", "E"];

export type AnswerCardStatus = "unanswered" | "correct" | "wrong";

export interface AnswerCardItem {
  questionId: string;
  number: number;
  index: number;
  status: AnswerCardStatus;
  current: boolean;
}

export function normalizeAnswer(answer: string | readonly AnswerValue[]): AnswerValue[] {
  if (typeof answer !== "string") {
    return normalizeLetters(answer);
  }

  const trimmed = answer.trim();
  if (trimmed === "√" || trimmed === "对" || trimmed.toLowerCase() === "true") {
    return ["true"];
  }
  if (trimmed === "×" || trimmed === "错" || trimmed.toLowerCase() === "false") {
    return ["false"];
  }

  return normalizeLetters(trimmed.toUpperCase().split("") as AnswerValue[]);
}

export function gradeQuestion(question: Question, selected: AnswerValue[]): boolean {
  const expected = normalizeAnswer(question.answer);
  const actual = normalizeAnswer(selected);
  return expected.length === actual.length && expected.every((value, index) => value === actual[index]);
}

export function summarizeRecords(records: Record<string, AnswerRecord>): RecordSummary {
  const values = Object.values(records);
  const answered = values.length;
  const correct = values.filter((record) => record.correct).length;
  const mistakes = answered - correct;

  return {
    answered,
    correct,
    mistakes,
    accuracy: answered === 0 ? 0 : Math.round((correct / answered) * 100)
  };
}

export function buildAnswerCardItems(
  questions: readonly Question[],
  records: Record<string, AnswerRecord>,
  currentIndex: number
): AnswerCardItem[] {
  return questions.map((question, index) => {
    const record = records[question.id];
    return {
      questionId: question.id,
      number: index + 1,
      index,
      status: record ? (record.correct ? "correct" : "wrong") : "unanswered",
      current: index === currentIndex
    };
  });
}

export function formatAnswer(answer: AnswerValue[]): string {
  return normalizeAnswer(answer)
    .map((value) => {
      if (value === "true") return "正确";
      if (value === "false") return "错误";
      return value;
    })
    .join("");
}

export function questionTypeLabel(type: QuestionType | "mixed" | "mistakes"): string {
  switch (type) {
    case "judge":
      return "判断题";
    case "single":
      return "单选题";
    case "multiple":
      return "多选题";
    case "mistakes":
      return "错题";
    default:
      return "混合练习";
  }
}

function normalizeLetters(values: readonly (AnswerValue | string)[]): AnswerValue[] {
  const unique = new Set<AnswerValue>();
  for (const value of values) {
    const normalized = String(value).trim().toUpperCase();
    if (normalized === "TRUE" || normalized === "FALSE") {
      unique.add(normalized.toLowerCase() as AnswerValue);
      continue;
    }
    if (ANSWER_ORDER.includes(normalized as AnswerValue)) {
      unique.add(normalized as AnswerValue);
    }
  }

  const booleanValues = Array.from(unique).filter((value) => value === "true" || value === "false");
  if (booleanValues.length > 0) {
    return booleanValues;
  }

  return ANSWER_ORDER.filter((value) => unique.has(value));
}
