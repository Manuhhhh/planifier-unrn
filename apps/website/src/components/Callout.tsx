import { AnimatePresence, motion } from "motion/react";
import { Button, mutedClass } from "./ui.tsx";

interface Props {
  open: boolean;
  title: string;
  message: string;
  actionLabel?: string;
  onDismiss: () => void;
  align?: "left" | "right";
}

/**
 * Generic floating card anchored under a trigger button, for a one-time hint or tip.
 * The trigger needs a `relative` wrapper; this positions itself `absolute` inside it.
 */
export function Callout({
  open,
  title,
  message,
  actionLabel = "Entendido",
  onDismiss,
  align = "left",
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97, transition: { duration: 0.12 } }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
          className={`absolute top-full z-20 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-stone-200 bg-white p-4 shadow-xl dark:border-stone-700 dark:bg-stone-800 ${
            align === "left" ? "left-0 origin-top-left" : "right-0 origin-top-right"
          }`}
        >
          <p className="mb-1 text-sm font-semibold">{title}</p>
          <p className={`mb-3 text-sm ${mutedClass}`}>{message}</p>
          <div className="flex justify-end">
            <Button onClick={onDismiss}>{actionLabel}</Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
