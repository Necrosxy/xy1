"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const THEME_STORAGE_KEY = "omnimedia-theme";
type Theme = "light" | "dark";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className = "theme-toggle", showLabel = false }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const current = readTheme();
    applyTheme(current);
    setTheme(current);
  }, []);

  function toggleTheme() {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    setTheme(nextTheme);
  }

  const nextLabel = theme === "dark" ? "切换浅色主题" : "切换深色主题";

  return (
    <button className={className} onClick={toggleTheme} type="button" aria-label={nextLabel} title={nextLabel}>
      {theme === "dark" ? <Sun aria-hidden="true" size={20} /> : <Moon aria-hidden="true" size={20} />}
      {showLabel ? <span>主题</span> : null}
    </button>
  );
}

function readTheme(): Theme {
  const htmlTheme = document.documentElement.dataset.theme;
  if (htmlTheme === "dark" || htmlTheme === "light") return htmlTheme;

  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage failures; the active DOM theme still changes.
  }
}
