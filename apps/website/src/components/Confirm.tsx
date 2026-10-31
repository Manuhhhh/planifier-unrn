import { AnimatePresence, motion } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { Warning } from "./icons.tsx";
import { Button } from "./ui.tsx";

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
}

type Ask = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Ask | null>(null);

interface Request {
  options: ConfirmOptions;
  resolve: (confirmed: boolean) => void;
}

/** Lets any component ask the user to confirm a destructive action in a modal. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<Request | null>(null);

  const ask = useCallback<Ask>(
    (options) =>
      new Promise((resolve) =>
        setRequest((previous) => {
          previous?.resolve(false);
          return { options, resolve };
        }),
      ),
    [],
  );

  const close = (confirmed: boolean) => {
    request?.resolve(confirmed);
    setRequest(null);
  };

  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      <AnimatePresence>
        {request && <ConfirmDialog options={request.options} onClose={close} />}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): Ask {
  const ask = useContext(ConfirmContext);
  if (!ask) throw new Error("useConfirm needs a ConfirmProvider");
  return ask;
}

function ConfirmDialog({
  options,
  onClose,
}: {
  options: ConfirmOptions;
  onClose: (confirmed: boolean) => void;
}) {
  const titleId = useId();
  const messageId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => previouslyFocused?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Two buttons: Tab and Shift+Tab just swap between them, so focus never leaves the dialog.
  const trapFocus = (event: KeyboardEvent) => {
    if (event.key !== "Tab") return;
    event.preventDefault();
    const target = document.activeElement === cancelRef.current ? confirmRef : cancelRef;
    target.current?.focus();
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose(false);
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        onKeyDown={trapFocus}
        className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl dark:border-stone-700 dark:bg-stone-800"
        initial={{ opacity: 0, y: 24, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
      >
        <motion.div
          aria-hidden="true"
          className="mb-3 flex size-10 items-center justify-center rounded-full bg-red-100 text-xl text-red-700 dark:bg-red-950 dark:text-red-400"
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 15, delay: 0.1 }}
        >
          <Warning className="size-5" />
        </motion.div>
        <h2 id={titleId} className="mb-1 text-lg font-semibold">
          {options.title}
        </h2>
        <p id={messageId} className="mb-5 text-sm text-stone-600 dark:text-stone-300">
          {options.message}
        </p>
        <div className="flex justify-end gap-2">
          <Button ref={cancelRef} onClick={() => onClose(false)}>
            Cancelar
          </Button>
          <Button ref={confirmRef} variant="danger" onClick={() => onClose(true)}>
            {options.confirmLabel}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
