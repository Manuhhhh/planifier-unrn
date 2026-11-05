import { useState } from "react";
import { loadHelpSeen, saveHelpSeen } from "../helpSeen.ts";

/** Whether the first-visit help hint was already dismissed, and a setter that persists it. */
export function useHelpSeen(): [boolean, () => void] {
  const [seen, setSeen] = useState(loadHelpSeen);
  const markSeen = () => {
    setSeen(true);
    saveHelpSeen();
  };
  return [seen, markSeen];
}
