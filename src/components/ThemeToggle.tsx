"use client";

import { useSyncExternalStore } from "react";

const storageKey = "reports-generator-theme";
const themeChangeEvent = "reports-generator-theme-change";

type ThemeName = "light" | "dark";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  window.addEventListener("storage", callback);
  window.addEventListener(themeChangeEvent, callback);
  mediaQuery.addEventListener("change", callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(themeChangeEvent, callback);
    mediaQuery.removeEventListener("change", callback);
  };
}

function getStoredTheme() {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(storageKey);

  return value === "light" || value === "dark" ? value : null;
}

function getClientSnapshot(): ThemeName {
  const storedTheme = getStoredTheme();

  if (storedTheme) {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getServerSnapshot(): ThemeName {
  return "light";
}

function setTheme(theme: ThemeName) {
  window.localStorage.setItem(storageKey, theme);
  document.documentElement.dataset.theme = theme;
  window.dispatchEvent(new Event(themeChangeEvent));
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot
  );
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <button
      aria-label={`Switch to ${nextTheme} theme`}
      className="theme-toggle"
      onClick={() => setTheme(nextTheme)}
      title={`Switch to ${nextTheme} theme`}
      type="button"
    >
      <span
        aria-hidden="true"
        className="theme-toggle-track"
      >
        <span
          className={`theme-toggle-thumb ${theme === "dark" ? "is-dark" : ""}`}
        />
      </span>
      <span className="theme-toggle-copy">{theme === "dark" ? "Dark" : "Light"}</span>
    </button>
  );
}
