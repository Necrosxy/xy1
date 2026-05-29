import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return [fullPath];
  });
}

describe("mini program style safety", () => {
  it("avoids layout features that rendered inconsistently in WeChat", () => {
    const files = walk(path.join(root, "miniprogram")).filter((file) => file.endsWith(".wxss"));
    const unsafePattern = /display:\s*grid|grid-template|gap:|env\(|calc\(|::|> view|\[disabled\]/;

    const offenders = files
      .map((file) => ({
        file: path.relative(root, file),
        matches: fs.readFileSync(file, "utf8").match(unsafePattern)
      }))
      .filter((result) => result.matches);

    expect(offenders).toEqual([]);
  });

  it("does not use native button elements for custom controls", () => {
    const files = walk(path.join(root, "miniprogram")).filter((file) => file.endsWith(".wxml"));
    const offenders = files.filter((file) => fs.readFileSync(file, "utf8").includes("<button"));

    expect(offenders).toEqual([]);
  });
});
