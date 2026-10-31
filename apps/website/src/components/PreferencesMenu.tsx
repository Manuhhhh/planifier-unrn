import { AnimatePresence, motion } from "motion/react";
import { useCallback, useId, useRef, useState } from "react";
import { useDismiss } from "../hooks/useDismiss.ts";
import type { Preferences, Theme } from "../preferences.ts";
import { Monitor, Moon, Settings, Sun } from "./icons.tsx";
import { Button, mutedClass } from "./ui.tsx";

const THEMES: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: "system", label: "Sistema", Icon: Monitor },
  { value: "light", label: "Claro", Icon: Sun },
  { value: "dark", label: "Oscuro", Icon: Moon },
];

interface Props {
  preferences: Preferences;
  onChange: (preferences: Preferences) => void;
}

export function PreferencesMenu({ preferences, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const close = useCallback(() => setOpen(false), []);
  useDismiss(root, open, close);

  return (
    <div ref={root} className="relative shrink-0">
      <Button
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2"
      >
        <motion.span
          aria-hidden="true"
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 18 }}
          className="inline-block"
        >
          <Settings />
        </motion.span>
        <span className="max-sm:sr-only">Preferencias</span>
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            role="dialog"
            aria-label="Preferencias"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97, transition: { duration: 0.12 } }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="absolute right-0 top-full z-20 mt-2 w-72 max-w-[calc(100vw-2rem)] origin-top-right rounded-xl border border-stone-200 bg-white p-4 shadow-xl dark:border-stone-700 dark:bg-stone-800"
          >
            <div role="radiogroup" aria-label="Tema" className="mb-4">
              <p className={`mb-2 text-sm font-semibold ${mutedClass}`}>Tema</p>
              <div className="flex rounded-lg bg-stone-100 p-1 dark:bg-stone-900">
                {THEMES.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={preferences.theme === value}
                    onClick={() => onChange({ ...preferences, theme: value })}
                    className="relative flex-1 cursor-pointer rounded-md px-2 py-1 text-sm"
                  >
                    {preferences.theme === value && (
                      <motion.span
                        layoutId="theme-pill"
                        className="absolute inset-0 rounded-md bg-white shadow dark:bg-stone-700"
                        transition={{ type: "spring", stiffness: 450, damping: 32 }}
                      />
                    )}
                    <span className="relative inline-flex items-center gap-1.5">
                      <Icon /> {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p id={`${panelId}-animations`} className="text-sm font-semibold">
                  Animaciones
                </p>
                <p className={`text-xs ${mutedClass}`}>Transiciones y movimiento</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={preferences.animations}
                aria-labelledby={`${panelId}-animations`}
                onClick={() => onChange({ ...preferences, animations: !preferences.animations })}
                className={`flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors ${
                  preferences.animations
                    ? "justify-end bg-red-700 dark:bg-red-500"
                    : "justify-start bg-stone-300 dark:bg-stone-600"
                }`}
              >
                <motion.span
                  layout
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="size-5 rounded-full bg-white shadow"
                />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
