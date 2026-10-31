import { useSyncExternalStore } from "react";

/** Below this width (Tailwind's `md`) the wide drawing of the plan does not fit. */
export const NARROW = "(max-width: 767px)";

const subscribe = (notify: () => void) => {
  const list = matchMedia(NARROW);
  list.addEventListener("change", notify);
  return () => list.removeEventListener("change", notify);
};

export function useNarrowScreen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => matchMedia(NARROW).matches,
    () => false,
  );
}
