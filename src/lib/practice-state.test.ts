import { describe, expect, it } from "vitest";

import {
  createInitialPracticeState,
  getPracticeState,
  markAnswer,
  resetPracticeState,
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
  it("creates a seven-day expiration window", () => {
    const now = new Date("2026-05-28T00:00:00.000Z");
    const state = createInitialPracticeState(now);

    expect(state.expiresAt).toBe("2026-06-04T00:00:00.000Z");
    expect(state.records).toEqual({});
    expect(state.favorites).toEqual([]);
  });

  it("resets expired local state before returning it", () => {
    const storage = new MemoryStorage();
    const expired = createInitialPracticeState(new Date("2026-05-01T00:00:00.000Z"));
    storage.setItem("omnimedia-practice:v1", JSON.stringify(expired));

    const state = getPracticeState(storage, new Date("2026-05-28T00:00:00.000Z"));

    expect(state.expiresAt).toBe("2026-06-04T00:00:00.000Z");
    expect(JSON.parse(storage.getItem("omnimedia-practice:v1") ?? "{}").expiresAt).toBe(
      "2026-06-04T00:00:00.000Z"
    );
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
});
