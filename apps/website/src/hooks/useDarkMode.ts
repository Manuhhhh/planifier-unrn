import { useSyncExternalStore } from "react";

const root = () => document.documentElement;

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(root(), { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

/**
 * Whether the page is shown dark: the `dark` class on <html>, which the preferences set. Pictures
 * drawn in code (not styled by CSS) use it to pick their colours, and follow it when it changes.
 */
export const useDarkMode = () =>
  useSyncExternalStore(subscribe, () => root().classList.contains("dark"));
