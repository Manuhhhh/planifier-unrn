import { useEffect, useState } from "react";
import { applyPreferences, loadPreferences, savePreferences } from "../preferences.ts";
import type { Preferences } from "../preferences.ts";

export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences>(loadPreferences);

  useEffect(() => {
    applyPreferences(preferences);
    savePreferences(preferences);

    // With the system theme, follow the OS if it switches while the page is open.
    if (preferences.theme !== "system") return;
    const query = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyPreferences(preferences);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [preferences]);

  return { preferences, setPreferences };
}
