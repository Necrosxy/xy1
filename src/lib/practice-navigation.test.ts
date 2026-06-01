import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");

describe("practice navigation", () => {
  it("restores and updates the last browsed question", () => {
    const client = fs.readFileSync(path.join(root, "src/components/PracticeClient.tsx"), "utf8");

    expect(client).toContain("findInitialPracticeIndex");
    expect(client).toContain("state.lastPractice");
    expect(client).toContain("questionId: nextQuestion.id");
  });

  it("keeps mistake review answers fresh instead of replaying stored records", () => {
    const client = fs.readFileSync(path.join(root, "src/components/PracticeClient.tsx"), "utf8");

    expect(client).toContain("reviewSessionRecords");
    expect(client).toContain("getPracticeAnswerRecord");
    expect(client).toContain("reviewMode ? reviewSessionRecords");
  });
});
