import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { ReactNode } from "react";
import { APPROVED_SLOT, CURRICULUM, planProblems, stepSlot } from "planner";
import type { StudyPlan } from "planner";
import { slotLabel } from "../labels.ts";
import { ChevronLeft, ChevronRight, CircleCheck, Warning } from "./icons.tsx";
import { Button } from "./ui.tsx";

const labelVariants = {
  enter: (direction: number) => ({ opacity: 0, x: direction * 28 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction * -28 }),
};

export function Stepper({
  plan,
  onChange,
  children,
}: {
  plan: StudyPlan;
  onChange: (plan: StudyPlan) => void;
  children?: ReactNode;
}) {
  // Slide the label the way the user is moving: forward comes in from the right.
  const [previous, setPrevious] = useState(plan.active);
  const [direction, setDirection] = useState(1);
  if (plan.active !== previous) {
    setDirection(plan.active > previous ? 1 : -1);
    setPrevious(plan.active);
  }

  const isLast = plan.active === plan.terms.length - 1;
  const warnings = planProblems(plan, CURRICULUM).length;
  const label = slotLabel(plan, plan.active);

  return (
    <div
      data-testid="stepper"
      className="flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 shadow-sm dark:border-stone-700 dark:bg-stone-800"
    >
      <Button
        disabled={plan.active === APPROVED_SLOT}
        onClick={() => onChange(stepSlot(plan, -1))}
        className="inline-flex items-center gap-1.5"
      >
        <ChevronLeft /> Anterior
      </Button>

      <div className="relative h-7 min-w-56 overflow-hidden text-center" data-testid="slot-label">
        <AnimatePresence mode="popLayout" custom={direction} initial={false}>
          <motion.strong
            key={label}
            custom={direction}
            variants={labelVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22 }}
            className="absolute inset-x-0"
          >
            {label}
          </motion.strong>
        </AnimatePresence>
      </div>

      <Button
        onClick={() => onChange(stepSlot(plan, 1))}
        className="inline-flex items-center gap-1.5"
      >
        {isLast ? "Siguiente cuatrimestre" : "Siguiente"} <ChevronRight />
      </Button>

      <div className="ml-auto" data-testid="status">
        <AnimatePresence mode="wait" initial={false}>
          {warnings > 0 ? (
            <motion.span
              key={`warn-${warnings}`}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ type: "spring", stiffness: 500, damping: 18 }}
              className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-400"
            >
              <Warning /> {warnings} {warnings === 1 ? "advertencia" : "advertencias"}
            </motion.span>
          ) : (
            <motion.span
              key="ok"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ type: "spring", stiffness: 500, damping: 18 }}
              className="inline-block text-sm font-semibold text-green-700 dark:text-green-400"
            >
              <CircleCheck /> Plan coherente
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      {children}
    </div>
  );
}
