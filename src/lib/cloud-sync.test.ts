import { describe, expect, it } from "vitest";

import { createInitialPracticeState, markAnswer, setLastPractice, toggleFavorite } from "./practice-state";
import { generateSyncKey, mergePracticeStates, normalizeSyncKey } from "./cloud-sync";

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

describe("cloud sync helpers", () => {
  it("normalizes human-entered sync keys", () => {
    expect(normalizeSyncKey(" abcd-1234 efgh ")).toBe("ABCD1234EFGH");
    expect(normalizeSyncKey("太短")).toBeNull();
  });

  it("generates a sync key that can be copied to another device", () => {
    const key = generateSyncKey(() => new Uint8Array([0, 1, 2, 10, 35, 36, 70, 255, 4, 5, 6, 7]));

    expect(key).toBe("ABCLDEG9EFGH");
    expect(normalizeSyncKey(key)).toBe(key);
  });

  it("merges records by latest answer and derives mistakes from merged records", () => {
    const localStorage = new MemoryStorage();
    const cloudStorage = new MemoryStorage();
    const localTime = new Date("2026-06-01T10:00:00.000Z");
    const cloudTime = new Date("2026-06-01T09:00:00.000Z");

    markAnswer(localStorage, "single-1", ["A"], false, localTime);
    markAnswer(cloudStorage, "single-1", ["B"], true, cloudTime);
    markAnswer(cloudStorage, "judge-1", ["true"], true, cloudTime);

    const merged = mergePracticeStates(
      JSON.parse(localStorage.getItem("omnimedia-practice:v1") ?? "{}"),
      JSON.parse(cloudStorage.getItem("omnimedia-practice:v1") ?? "{}"),
      new Date("2026-06-01T11:00:00.000Z")
    );

    expect(merged.records["single-1"].selected).toEqual(["A"]);
    expect(merged.records["judge-1"].selected).toEqual(["true"]);
    expect(merged.mistakes).toEqual(["single-1"]);
    expect(merged.updatedAt).toBe("2026-06-01T11:00:00.000Z");
  });

  it("uses newer state-level favorites and last practice so deletions can sync", () => {
    const olderStorage = new MemoryStorage();
    const newerStorage = new MemoryStorage();
    const older = new Date("2026-06-01T09:00:00.000Z");
    const newer = new Date("2026-06-01T10:00:00.000Z");

    toggleFavorite(olderStorage, "single-1", older);
    setLastPractice(olderStorage, { type: "single", mode: "ordered", questionId: "single-1" }, older);
    setLastPractice(newerStorage, { type: "judge", mode: "ordered", questionId: "judge-1" }, newer);

    const merged = mergePracticeStates(
      JSON.parse(newerStorage.getItem("omnimedia-practice:v1") ?? "{}"),
      JSON.parse(olderStorage.getItem("omnimedia-practice:v1") ?? "{}"),
      new Date("2026-06-01T11:00:00.000Z")
    );

    expect(merged.favorites).toEqual([]);
    expect(merged.lastPractice).toEqual({ type: "judge", mode: "ordered", questionId: "judge-1" });
  });

  it("can merge into an empty cloud state", () => {
    const state = createInitialPracticeState(new Date("2026-06-01T09:00:00.000Z"));
    const merged = mergePracticeStates(state, null, new Date("2026-06-01T10:00:00.000Z"));

    expect(merged.createdAt).toBe("2026-06-01T09:00:00.000Z");
    expect(merged.updatedAt).toBe("2026-06-01T10:00:00.000Z");
  });

  it("merges older cloud states that do not have newer metadata fields", () => {
    const localStorage = new MemoryStorage();
    const cloudStorage = new MemoryStorage();

    markAnswer(localStorage, "judge-1", ["true"], true, new Date("2026-06-01T10:00:00.000Z"));
    markAnswer(cloudStorage, "single-1", ["B"], true, new Date("2026-06-01T09:00:00.000Z"));
    const cloudState = JSON.parse(cloudStorage.getItem("omnimedia-practice:v1") ?? "{}");
    delete cloudState.updatedAt;
    delete cloudState.answerCorrections;

    const merged = mergePracticeStates(
      JSON.parse(localStorage.getItem("omnimedia-practice:v1") ?? "{}"),
      cloudState,
      new Date("2026-06-01T11:00:00.000Z")
    );

    expect(merged.records["judge-1"]).toBeDefined();
    expect(merged.records["single-1"]).toBeDefined();
    expect(merged.answerCorrections).toEqual({});
  });
});
