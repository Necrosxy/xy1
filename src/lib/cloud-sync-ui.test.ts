import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");

describe("cloud sync UI", () => {
  it("adds a multi-device sync panel to the stats page", () => {
    const statsPage = fs.readFileSync(path.join(root, "src/app/stats/page.tsx"), "utf8");

    expect(statsPage).toContain("多设备同步");
    expect(statsPage).toContain("generateSyncKey");
    expect(statsPage).toContain("syncWithCloud");
    expect(statsPage).toContain("replaceState");
    expect(statsPage).toContain("/api/sync");
  });
});
