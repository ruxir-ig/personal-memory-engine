"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

function readTheme(): "dark" | "light" {
  if (typeof document === "undefined") return "dark";
  return (document.documentElement.dataset.theme as "dark" | "light") || "dark";
}

function applyTheme(theme: "dark" | "light") {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("quipu-theme", theme);
  } catch {
    /* ignore */
  }
}

export function ThemeSetting() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  function choose(next: "dark" | "light") {
    setTheme(next);
    applyTheme(next);
  }

  return (
    <div className="settings-row">
      <div className="settings-row-copy">
        <strong>Appearance</strong>
        <p className="faint">Light or dark interface</p>
      </div>
      <div className="seg" role="group" aria-label="Theme">
        <button className="seg-btn" type="button" data-active={theme === "light"} onClick={() => choose("light")}>
          <Sun size={14} aria-hidden="true" />
          Light
        </button>
        <button className="seg-btn" type="button" data-active={theme === "dark"} onClick={() => choose("dark")}>
          <Moon size={14} aria-hidden="true" />
          Dark
        </button>
      </div>
    </div>
  );
}
