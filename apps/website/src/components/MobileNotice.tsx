import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useNarrowScreen } from "../hooks/useNarrowScreen.ts";
import { Close } from "./icons.tsx";

const KEY = "planifier-unrn:mobile-notice-seen:v1";

function loadSeen(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function saveSeen(): void {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    // Storage can be unavailable (private mode, quota); the notice just shows again next time.
  }
}

/**
 * Tells someone on a phone that the site is made for a computer: the graphs and lists are built
 * for a wide screen and look cramped on a small one. Shown until they dismiss it.
 */
export function MobileNotice() {
  const narrow = useNarrowScreen();
  const [seen, setSeen] = useState(loadSeen);

  const dismiss = () => {
    saveSeen();
    setSeen(true);
  };

  return (
    <AnimatePresence initial={false}>
      {narrow && !seen && (
        <motion.div
          role="status"
          data-testid="mobile-notice"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="mx-4 mt-3 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
            <p className="mr-auto">
              <strong className="font-semibold">Este sitio está pensado para computadora.</strong>{" "}
              En el celular los gráficos y las listas se ven más apretados, y la experiencia es
              peor. Para planificar con comodidad, entrá desde una pantalla más grande.
            </p>
            <button
              type="button"
              aria-label="Cerrar aviso"
              onClick={dismiss}
              className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-amber-200 dark:hover:bg-amber-900"
            >
              <Close />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
