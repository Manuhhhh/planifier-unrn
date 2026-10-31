import { useSyncExternalStore } from "react";

const QUERY = "(pointer: coarse)";

const subscribe = (notify: () => void) => {
  const list = matchMedia(QUERY);
  list.addEventListener("change", notify);
  return () => list.removeEventListener("change", notify);
};

/** True when the main way of pointing is a finger: there is no hover, and taps are imprecise. */
export function useCoarsePointer(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => matchMedia(QUERY).matches,
    () => false,
  );
}
