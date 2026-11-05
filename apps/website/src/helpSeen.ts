// Tracks whether the user already saw the one-time "first visit" help hint.
const KEY = "planifier-unrn:help-seen:v1";

export function loadHelpSeen(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function saveHelpSeen(): void {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    // Storage can be unavailable (private mode, quota); the hint just reappears next time.
  }
}
