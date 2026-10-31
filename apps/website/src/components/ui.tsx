import { motion } from "motion/react";
import type { ComponentProps, ReactNode } from "react";

export const panelClass =
  "relative rounded-xl border border-stone-200 bg-white p-4 shadow-sm md:h-full md:overflow-y-auto dark:border-stone-700 dark:bg-stone-800";

/** Page frame, header bar and main grid, shared by the app and its loading skeleton so they never drift. */
export const shellClass = "flex min-h-dvh w-full flex-col md:h-dvh";
export const headerClass =
  "relative z-30 flex items-center justify-between gap-4 border-b border-stone-200 bg-white px-4 py-3 md:px-8 dark:border-stone-700 dark:bg-stone-900";
export const pageClass = "flex min-h-0 flex-1 flex-col px-4 pb-4 pt-4 md:px-8";
/** Extra room at the bottom of a phone page, so the floating cuatrimestre bar never covers content. */
export const floatingBarRoom = "max-md:pb-28";
// `grid-cols-1` is minmax(0, 1fr): without it a wide child (the graph) stretches the whole page.
export const mainClass = "mt-4 grid min-h-0 flex-1 grid-cols-1 gap-6 md:grid-cols-2";

export const fieldClass =
  "rounded-md border border-stone-200 bg-white px-2 py-1.5 transition-shadow focus:shadow-md dark:border-stone-700 dark:bg-stone-800";

export const mutedClass = "text-stone-500 dark:text-stone-400";
export const problemClass = "text-amber-700 dark:text-amber-400";

/** A pulsing placeholder block; size it with `className` to match the content it stands for. */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-stone-200 motion-reduce:animate-none dark:bg-stone-700 ${className}`}
    />
  );
}

const pressable = "transition duration-150 active:scale-95 motion-reduce:transition-none";

export function Button({
  className = "",
  variant = "default",
  ...props
}: ComponentProps<"button"> & { variant?: "default" | "danger" }) {
  const colors =
    variant === "danger"
      ? "border-red-700 bg-red-700 text-white enabled:hover:bg-red-800 dark:border-red-500 dark:bg-red-600 dark:enabled:hover:bg-red-500"
      : "border-stone-200 bg-white enabled:hover:-translate-y-0.5 enabled:hover:border-red-700 enabled:hover:shadow-md dark:border-stone-700 dark:bg-stone-800 dark:enabled:hover:border-red-400";
  return (
    <button
      type="button"
      className={`cursor-pointer rounded-md border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-45 ${pressable} ${colors} ${className}`}
      {...props}
    />
  );
}

export function IconButton({
  className = "",
  spin = true,
  ...props
}: ComponentProps<"button"> & { spin?: boolean }) {
  return (
    <button
      type="button"
      className={`cursor-pointer px-2 text-stone-500 max-md:p-2.5 ${spin ? "hover:rotate-90" : ""} hover:text-red-700 dark:text-stone-400 dark:hover:text-red-400 ${pressable} ${className}`}
      {...props}
    />
  );
}

/** Fades and rises into place; `delay` staggers sibling sections on first load. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

/**
 * A checkbox drawn by hand. The real input stays in the page, hidden but focusable, so the
 * keyboard, the label click and screen readers all work as with a native one.
 */
export function Checkbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="group flex cursor-pointer select-none items-center gap-2 whitespace-nowrap">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <motion.span
        aria-hidden="true"
        whileTap={{ scale: 0.85 }}
        transition={{ type: "spring", stiffness: 500, damping: 20 }}
        className={`flex size-5 items-center justify-center rounded-md border-2 transition-colors duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-red-700 dark:peer-focus-visible:outline-red-400 ${
          checked
            ? "border-red-700 bg-red-700 dark:border-red-500 dark:bg-red-500"
            : "border-stone-300 bg-white group-hover:border-red-700 dark:border-stone-600 dark:bg-stone-800 dark:group-hover:border-red-400"
        }`}
      >
        <svg viewBox="0 0 16 16" className="size-3.5">
          <motion.path
            d="M3 8.5 L6.5 12 L13 4.5"
            fill="none"
            stroke="white"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
            transition={{ duration: 0.2 }}
          />
        </svg>
      </motion.span>
      {children}
    </label>
  );
}
