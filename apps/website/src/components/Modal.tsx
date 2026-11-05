import { motion } from "motion/react";
import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { Close } from "./icons.tsx";
import { IconButton } from "./ui.tsx";

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Generic centered dialog with a backdrop: title, a close button and free-form content.
 * Closes on Escape or a click outside. Render it inside `AnimatePresence` so it can exit.
 */
export function Modal({ title, onClose, children }: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => previouslyFocused?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl focus:outline-none dark:border-stone-700 dark:bg-stone-800"
        initial={{ opacity: 0, y: 24, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <IconButton aria-label="Cerrar" spin={false} onClick={onClose} className="-m-2 shrink-0">
            <Close />
          </IconButton>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}
