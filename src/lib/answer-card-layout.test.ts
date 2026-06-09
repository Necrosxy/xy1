import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");

describe("answer card layout", () => {
  it("keeps answer-card controls fixed while the number grid scrolls to the end", () => {
    const css = fs.readFileSync(path.join(root, "src/app/globals.css"), "utf8");

    expect(css).toMatch(/\.answer-card-sheet\s*{[^}]*display:\s*flex/s);
    expect(css).toMatch(/\.answer-card-sheet\s*{[^}]*overflow:\s*hidden/s);
    expect(css).toMatch(/\.answer-card-grid\s*{[^}]*flex:\s*1\s+1\s+auto/s);
    expect(css).toMatch(/\.answer-card-grid\s*{[^}]*min-height:\s*0/s);
    expect(css).toMatch(/\.answer-card-grid\s*{[^}]*overflow-y:\s*auto/s);
  });

  it("positions the current question within the answer-card grid without page-level scrolling", () => {
    const client = fs.readFileSync(path.join(root, "src/components/PracticeClient.tsx"), "utf8");

    expect(client).toContain("answerCardGridRef");
    expect(client).not.toContain("scrollIntoView");
    expect(client).toContain("grid.scrollTop");
  });
});
