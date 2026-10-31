import { MotionGlobalConfig } from "motion/react";

export type Theme = "system" | "light" | "dark";

export interface Preferences {
  theme: Theme;
  animations: boolean;
}

// index.html reads this same key before first paint, so the theme never flashes.
const KEY = "planifier-unrn:prefs:v1";

export const defaultPreferences: Preferences = { theme: "system", animations: true };

/** Rebuilds preferences from untrusted JSON, falling back to the default per field. */
export function parsePreferences(raw: unknown): Preferences {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return defaultPreferences;
  const { theme, animations } = raw as Record<string, unknown>;
  return {
    theme:
      theme === "light" || theme === "dark" || theme === "system"
        ? theme
        : defaultPreferences.theme,
    animations: typeof animations === "boolean" ? animations : defaultPreferences.animations,
  };
}

export function loadPreferences(): Preferences {
  try {
    return parsePreferences(JSON.parse(localStorage.getItem(KEY) ?? "null"));
  } catch {
    return defaultPreferences;
  }
}

export function savePreferences(preferences: Preferences): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(preferences));
  } catch {
    // Storage can be unavailable (private mode, quota); the preferences still apply this session.
  }
}

export const systemPrefersDark = () => matchMedia("(prefers-color-scheme: dark)").matches;

/** Reflects the preferences on the page: the `dark` class, and every animation switched on or off. */
export function applyPreferences({ theme, animations }: Preferences): void {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark" || (theme === "system" && systemPrefersDark()));
  root.dataset.animations = animations ? "on" : "off";
  MotionGlobalConfig.skipAnimations = !animations;
}
