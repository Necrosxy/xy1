import { describe, expect, it } from "vitest";

import { createMiniProgramDataModule } from "../../scripts/lib/miniprogram-data";

describe("createMiniProgramDataModule", () => {
  it("wraps the question bank as a CommonJS module for native mini programs", () => {
    const output = createMiniProgramDataModule({
      title: "测试题库",
      counts: { judge: 1, single: 0, multiple: 0 },
      total: 1,
      questions: [
        {
          id: "judge-1",
          type: "judge",
          number: 1,
          stem: "测试判断题",
          options: [],
          answer: ["true"],
          sourcePage: 1
        }
      ]
    });

    expect(output).toContain("module.exports = ");
    expect(output).toContain('"total": 1');
    expect(output).toContain('"id": "judge-1"');
    expect(output.endsWith("\n")).toBe(true);
  });
});
