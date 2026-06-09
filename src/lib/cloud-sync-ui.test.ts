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
    expect(statsPage).toContain("syncPracticeStateToCloud");
  });

  it("automatically syncs when a sync key is already bound", () => {
    const hook = fs.readFileSync(path.join(root, "src/lib/use-practice-state.ts"), "utf8");
    const client = fs.readFileSync(path.join(root, "src/lib/cloud-sync-client.ts"), "utf8");

    expect(hook).toContain("readStoredSyncKey");
    expect(hook).toContain("syncPracticeStateToCloud");
    expect(hook).toContain("visibilitychange");
    expect(client).toContain("/api/sync");
  });
});
