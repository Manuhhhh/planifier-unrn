import { AnimatePresence, motion } from "motion/react";
import { useCallback, useId, useRef, useState } from "react";
import type { StudyPlan, Term } from "planner";
import { useDismiss } from "../hooks/useDismiss.ts";
import { ordinal } from "../labels.ts";
import { MAX_YEAR, MIN_YEAR, TERM_MONTHS, shiftYear } from "../startPicker.ts";
import { Calendar, ChevronDown } from "./icons.tsx";
import { fieldClass } from "./ui.tsx";

const TERMS: Term[] = [1, 2];

const yearVariants = {
  enter: (direction: number) => ({ opacity: 0, y: direction * 18 }),
  center: { opacity: 1, y: 0 },
  exit: (direction: number) => ({ opacity: 0, y: direction * -18 }),
};

interface Props {
  plan: StudyPlan;
  onChange: (plan: StudyPlan) => void;
}

/** Where the plan starts: a year stepper and the two cuatrimestres as cards, in a floating panel. */
export function StartPicker({ plan, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const close = useCallback(() => setOpen(false), []);
  useDismiss(root, open, close);

  // Slide the year the way it is moving: later years come up from below.
  const [previousYear, setPreviousYear] = useState(plan.startYear);
  const [direction, setDirection] = useState(1);
  if (plan.startYear !== previousYear) {
    setDirection(plan.startYear > previousYear ? 1 : -1);
    setPreviousYear(plan.startYear);
  }

  const setYear = (delta: number) =>
    onChange({ ...plan, startYear: shiftYear(plan.startYear, delta) });
  const stepClass =
    "flex size-9 cursor-pointer items-center justify-center rounded-lg border border-stone-200 text-2xl leading-none transition duration-150 enabled:hover:border-red-700 enabled:active:scale-90 disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-700 dark:enabled:hover:border-red-400";

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`Empieza en ${plan.startYear}, ${ordinal(plan.startTerm)} cuatrimestre`}
        onClick={() => setOpen((value) => !value)}
        className={`${fieldClass} flex cursor-pointer items-center gap-2 max-md:w-full transition duration-150 hover:border-red-700 active:scale-95 dark:hover:border-red-400`}
      >
        <Calendar />
        <span>
          {plan.startYear} · {ordinal(plan.startTerm)} cuatrimestre
        </span>
        <motion.span
          aria-hidden="true"
          animate={{ rotate: open ? 180 : 0 }}
          className="text-stone-500 dark:text-stone-400"
        >
          <ChevronDown />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            role="dialog"
            aria-label="Cuándo empieza el plan"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97, transition: { duration: 0.12 } }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="absolute left-0 top-full z-20 mt-2 w-88 max-w-[calc(100vw-2rem)] origin-top-left rounded-xl border border-stone-200 bg-white p-4 shadow-xl dark:border-stone-700 dark:bg-stone-800"
          >
            <p className="mb-2 text-sm font-semibold text-stone-500 dark:text-stone-400">Año</p>
            <div className="mb-4 flex items-center justify-between rounded-xl bg-stone-100 p-2 dark:bg-stone-900">
              <button
                type="button"
                aria-label="Año anterior"
                disabled={plan.startYear <= MIN_YEAR}
                onClick={() => setYear(-1)}
                className={stepClass}
              >
                ‹
              </button>
              <div
                aria-live="polite"
                aria-label="Año de inicio"
                className="relative h-9 w-24 overflow-hidden text-center text-2xl font-bold"
              >
                <AnimatePresence mode="popLayout" custom={direction} initial={false}>
                  <motion.span
                    key={plan.startYear}
                    custom={direction}
                    variants={yearVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.18 }}
                    className="absolute inset-x-0 leading-9"
                  >
                    {plan.startYear}
                  </motion.span>
                </AnimatePresence>
              </div>
              <button
                type="button"
                aria-label="Año siguiente"
                disabled={plan.startYear >= MAX_YEAR}
                onClick={() => setYear(1)}
                className={stepClass}
              >
                ›
              </button>
            </div>

            <div role="radiogroup" aria-label="Cuatrimestre de inicio">
              <p className="mb-2 text-sm font-semibold text-stone-500 dark:text-stone-400">
                Cuatrimestre
              </p>
              <div className="grid grid-cols-2 gap-2">
                {TERMS.map((term) => (
                  <button
                    key={term}
                    type="button"
                    role="radio"
                    aria-checked={plan.startTerm === term}
                    onClick={() => onChange({ ...plan, startTerm: term })}
                    className="relative cursor-pointer rounded-xl border border-stone-200 px-3 py-2 text-left transition duration-150 hover:border-red-700 active:scale-95 dark:border-stone-700 dark:hover:border-red-400"
                  >
                    {plan.startTerm === term && (
                      <motion.span
                        layoutId="start-term-pill"
                        className="absolute inset-0 rounded-xl border-2 border-red-700 bg-red-100 dark:border-red-400 dark:bg-red-950"
                        transition={{ type: "spring", stiffness: 450, damping: 32 }}
                      />
                    )}
                    <span className="relative block font-semibold">{ordinal(term)}</span>
                    <span className="relative block whitespace-nowrap text-xs text-stone-500 dark:text-stone-400">
                      {TERM_MONTHS[term]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
