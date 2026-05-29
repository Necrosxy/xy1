import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");

describe("home layout", () => {
  it("keeps the start practice call-to-action fixed above the bottom navigation", () => {
    const page = fs.readFileSync(path.join(root, "src/app/page.tsx"), "utf8");
    const css = fs.readFileSync(path.join(root, "src/app/globals.css"), "utf8");

    expect(page).toContain('className="screen home-screen"');
    expect(page).toContain('className="home-fixed-start"');
    expect(css).toMatch(/\.home-fixed-start\s*{[^}]*position:\s*fixed/s);
    expect(css).toMatch(/\.home-screen\s*{[^}]*padding-bottom:/s);
  });
});
