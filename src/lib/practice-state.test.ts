import { describe, expect, it } from "vitest";

import {
  clearAnswerCorrection,
  createInitialPracticeState,
  getPracticeState,
  markAnswer,
  replacePracticeState,
  resetPracticeState,
  setAnswerCorrection,
  toggleFavorite
} from "./practice-state";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe("practice state", () => {
  it("creates a permanent storage window", () => {
    const now = new Date("2026-05-28T00:00:00.000Z");
    const state = createInitialPracticeState(now);

    expect(state.expiresAt).toBe("9999-12-31T23:59:59.999Z");
    expect(state.updatedAt).toBe("2026-05-28T00:00:00.000Z");
    expect(state.records).toEqual({});
    expect(state.favorites).toEqual([]);
    expect(state.answerCorrections).toEqual({});
  });

  it("keeps previously expired local state instead of clearing it", () => {
    const storage = new MemoryStorage();
    const expired = createInitialPracticeState(new Date("2026-05-01T00:00:00.000Z"));
    const oldState = {
      ...expired,
      expiresAt: "2026-05-08T00:00:00.000Z",
      records: {
        "judge-1": {
          questionId: "judge-1",
          selected: ["true"],
          correct: true,
          answeredAt: "2026-05-01T00:00:00.000Z",
          attempts: 1
        }
      }
    };
    storage.setItem("omnimedia-practice:v1", JSON.stringify(oldState));

    const state = getPracticeState(storage, new Date("2026-05-28T00:00:00.000Z"));

    expect(state.records["judge-1"]).toEqual(oldState.records["judge-1"]);
    expect(JSON.parse(storage.getItem("omnimedia-practice:v1") ?? "{}").expiresAt).toBe(
      "2026-05-08T00:00:00.000Z"
    );
  });

  it("migrates older local state without clearing records", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      "omnimedia-practice:v1",
      JSON.stringify({
        version: 1,
        createdAt: "2026-05-01T00:00:00.000Z",
        expiresAt: "9999-12-31T23:59:59.999Z",
        records: {
          "single-1": {
            questionId: "single-1",
            selected: ["A"],
            correct: false,
            answeredAt: "2026-05-01T00:00:00.000Z",
            attempts: 1
          }
        },
        mistakes: ["single-1"],
        favorites: ["single-1"]
      })
    );

    const state = getPracticeState(storage, new Date("2026-05-28T00:00:00.000Z"));

    expect(state.records["single-1"]?.attempts).toBe(1);
    expect(state.answerCorrections).toEqual({});
    expect(JSON.parse(storage.getItem("omnimedia-practice:v1") ?? "{}").answerCorrections).toEqual({});
  });

  it("stores corrected answers and regrades existing records", () => {
    const storage = new MemoryStorage();
    const now = new Date("2026-05-28T00:00:00.000Z");
    resetPracticeState(storage, now);

    markAnswer(storage, "single-1", ["A"], false, now);
    const corrected = setAnswerCorrection(storage, "single-1", ["A"], now);

    expect(corrected.answerCorrections["single-1"]).toEqual(["A"]);
    expect(corrected.records["single-1"].correct).toBe(true);
    expect(corrected.records["single-1"].attempts).toBe(1);
    expect(corrected.mistakes).toEqual([]);
  });

  it("removes corrected answers and regrades existing records against the original answer", () => {
    const storage = new MemoryStorage();
    const now = new Date("2026-05-28T00:00:00.000Z");
    resetPracticeState(storage, now);

    markAnswer(storage, "single-1", ["A"], false, now);
    setAnswerCorrection(storage, "single-1", ["A"], now);
    const restored = clearAnswerCorrection(storage, "single-1", ["B"], now);

    expect(restored.answerCorrections["single-1"]).toBeUndefined();
    expect(restored.records["single-1"].correct).toBe(false);
    expect(restored.records["single-1"].attempts).toBe(1);
    expect(restored.mistakes).toEqual(["single-1"]);
  });

  it("records mistakes and removes them after a correct retry", () => {
    const storage = new MemoryStorage();
    const now = new Date("2026-05-28T00:00:00.000Z");
    resetPracticeState(storage, now);

    const wrong = markAnswer(storage, "single-1", ["A"], false, now);
    expect(wrong.mistakes).toEqual(["single-1"]);
    expect(wrong.records["single-1"].attempts).toBe(1);

    const corrected = markAnswer(storage, "single-1", ["B"], true, now);
    expect(corrected.mistakes).toEqual([]);
    expect(corrected.records["single-1"].attempts).toBe(2);
  });

  it("toggles favorites without duplicating ids", () => {
    const storage = new MemoryStorage();
    const now = new Date("2026-05-28T00:00:00.000Z");
    resetPracticeState(storage, now);

    expect(toggleFavorite(storage, "judge-1", now).favorites).toEqual(["judge-1"]);
    expect(toggleFavorite(storage, "judge-1", now).favorites).toEqual([]);
  });

  it("replaces local state after cloud sync", () => {
    const storage = new MemoryStorage();
    const state = {
      ...createInitialPracticeState(new Date("2026-06-01T00:00:00.000Z")),
      favorites: ["judge-1"]
    };

    replacePracticeState(storage, state);

    expect(getPracticeState(storage).favorites).toEqual(["judge-1"]);
  });
});
