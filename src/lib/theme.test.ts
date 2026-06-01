import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");

describe("theme setup", () => {
  it("defines light and dark CSS themes", () => {
    const css = fs.readFileSync(path.join(root, "src/app/globals.css"), "utf8");

    expect(css).toContain('[data-theme="light"]');
    expect(css).toContain('[data-theme="dark"]');
  });

  it("boots the saved theme before rendering and exposes a theme toggle", () => {
    const layout = fs.readFileSync(path.join(root, "src/app/layout.tsx"), "utf8");
    const toggle = fs.readFileSync(path.join(root, "src/components/ThemeToggle.tsx"), "utf8");

    expect(layout).toContain("ThemeBootScript");
    expect(layout).toContain("suppressHydrationWarning");
    expect(toggle).toContain("omnimedia-theme");
    expect(toggle).toContain("dataset.theme");
  });

  it("overrides hard-coded success and error states in dark mode", () => {
    const css = fs.readFileSync(path.join(root, "src/app/globals.css"), "utf8");

    expect(css).toContain('[data-theme="dark"] .pill-corrected');
    expect(css).toContain('[data-theme="dark"] .result-box.is-correct');
    expect(css).toContain('[data-theme="dark"] .result-box.is-wrong');
    expect(css).toContain('[data-theme="dark"] .answer-card-cell.is-correct');
    expect(css).toContain('[data-theme="dark"] .answer-card-cell.is-wrong');
    expect(css).toContain('[data-theme="dark"] .answer-card-cell.is-current');
  });
});
