import { describe, expect, it } from "vitest";

import type { AnswerRecord, Question } from "./types";
import { buildAnswerCardItems, gradeQuestion, normalizeAnswer, summarizeRecords } from "./question-utils";

describe("gradeQuestion", () => {
  const single: Question = {
    id: "single-1",
    type: "single",
    number: 1,
    stem: "测试单选题",
    options: [
      { key: "A", text: "选项 A" },
      { key: "B", text: "选项 B" }
    ],
    answer: ["B"],
    sourcePage: 1
  };

  const multiple: Question = {
    id: "multiple-1",
    type: "multiple",
    number: 1,
    stem: "测试多选题",
    options: [
      { key: "A", text: "选项 A" },
      { key: "B", text: "选项 B" },
      { key: "C", text: "选项 C" }
    ],
    answer: ["A", "C"],
    sourcePage: 2
  };

  it("grades single-choice answers exactly", () => {
    expect(gradeQuestion(single, ["B"])).toBe(true);
    expect(gradeQuestion(single, ["A"])).toBe(false);
  });

  it("grades multiple-choice answers without caring about order", () => {
    expect(gradeQuestion(multiple, ["C", "A"])).toBe(true);
    expect(gradeQuestion(multiple, ["A"])).toBe(false);
    expect(gradeQuestion(multiple, ["A", "B", "C"])).toBe(false);
  });
});

describe("normalizeAnswer", () => {
  it("normalizes judgment symbols and answer letters", () => {
    expect(normalizeAnswer("√")).toEqual(["true"]);
    expect(normalizeAnswer("×")).toEqual(["false"]);
    expect(normalizeAnswer("cba")).toEqual(["A", "B", "C"]);
  });
});

describe("summarizeRecords", () => {
  it("counts totals, correct answers, and mistakes from records", () => {
    const records: Record<string, AnswerRecord> = {
      "single-1": {
        questionId: "single-1",
        selected: ["A"],
        correct: false,
        answeredAt: "2026-05-28T00:00:00.000Z",
        attempts: 1
      },
      "judge-1": {
        questionId: "judge-1",
        selected: ["true"],
        correct: true,
        answeredAt: "2026-05-28T01:00:00.000Z",
        attempts: 2
      }
    };

    expect(summarizeRecords(records)).toEqual({
      answered: 2,
      correct: 1,
      mistakes: 1,
      accuracy: 50
    });
  });
});

describe("buildAnswerCardItems", () => {
  it("marks current, correct, wrong, and unanswered questions", () => {
    const questions: Question[] = [
      {
        id: "judge-1",
        type: "judge",
        number: 1,
        stem: "判断 1",
        options: [],
        answer: ["true"],
        sourcePage: 1
      },
      {
        id: "judge-2",
        type: "judge",
        number: 2,
        stem: "判断 2",
        options: [],
        answer: ["false"],
        sourcePage: 1
      },
      {
        id: "judge-3",
        type: "judge",
        number: 3,
        stem: "判断 3",
        options: [],
        answer: ["true"],
        sourcePage: 1
      }
    ];
    const records: Record<string, AnswerRecord> = {
      "judge-1": {
        questionId: "judge-1",
        selected: ["true"],
        correct: true,
        answeredAt: "2026-05-29T00:00:00.000Z",
        attempts: 1
      },
      "judge-2": {
        questionId: "judge-2",
        selected: ["true"],
        correct: false,
        answeredAt: "2026-05-29T00:01:00.000Z",
        attempts: 1
      }
    };

    expect(buildAnswerCardItems(questions, records, 1)).toEqual([
      { questionId: "judge-1", number: 1, index: 0, status: "correct", current: false },
      { questionId: "judge-2", number: 2, index: 1, status: "wrong", current: true },
      { questionId: "judge-3", number: 3, index: 2, status: "unanswered", current: false }
    ]);
  });
});
