import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { hashSyncKey } from "./cloud-sync-server";

const root = path.resolve(__dirname, "../..");

describe("cloud sync server wiring", () => {
  it("hashes sync keys before storing them", () => {
    expect(hashSyncKey("ABCD1234EFGH")).toMatch(/^[a-f0-9]{64}$/);
    expect(hashSyncKey("ABCD1234EFGH")).toBe(hashSyncKey("abcd-1234-efgh"));
  });

  it("exposes a node runtime API route for Neon sync", () => {
    const route = fs.readFileSync(path.join(root, "src/app/api/sync/route.ts"), "utf8");

    expect(route).toContain('runtime = "nodejs"');
    expect(route).toContain("syncPracticeStateWithCloud");
    expect(route).toContain("DATABASE_URL");
  });
});
