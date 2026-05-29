import { describe, expect, it } from "vitest";

import {
  createInitialPracticeState,
  gradeQuestion,
  markAnswer,
  summarizeRecords
} from "../../miniprogram/utils/practice-core";

describe("mini program practice core", () => {
  it("grades multiple-choice answers independent of order", () => {
    expect(gradeQuestion({ answer: ["A", "C"] }, ["C", "A"])).toBe(true);
    expect(gradeQuestion({ answer: ["A", "C"] }, ["A", "B", "C"])).toBe(false);
  });

  it("creates seven-day state and removes mistakes after correct retry", () => {
    const now = new Date("2026-05-29T00:00:00.000Z");
    const initial = createInitialPracticeState(now);

    expect(initial.expiresAt).toBe("2026-06-05T00:00:00.000Z");

    const wrong = markAnswer(initial, "judge-1", ["false"], false, now);
    expect(wrong.mistakes).toEqual(["judge-1"]);

    const corrected = markAnswer(wrong, "judge-1", ["true"], true, now);
    expect(corrected.mistakes).toEqual([]);
    expect(corrected.records["judge-1"].attempts).toBe(2);
  });

  it("summarizes stored records", () => {
    const state = markAnswer(createInitialPracticeState(new Date("2026-05-29T00:00:00.000Z")), "single-1", ["B"], true);

    expect(summarizeRecords(state.records)).toEqual({
      answered: 1,
      correct: 1,
      mistakes: 0,
      accuracy: 100
    });
  });
});
