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
      {/* On a phone the way through the cuatrimestres floats at the bottom, within thumb's reach. */}
      <div className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 flex items-center gap-2 rounded-2xl border border-stone-200 bg-white p-2 shadow-xl md:contents dark:border-stone-700 dark:bg-stone-800">
        <Button
          disabled={plan.active === APPROVED_SLOT}
          onClick={() => onChange(stepSlot(plan, -1))}
          className="inline-flex items-center gap-1.5 max-md:px-4 max-md:py-2.5"
        >
          <ChevronLeft /> <span className="max-md:sr-only">Anterior</span>
        </Button>

        <div
          className="relative h-7 overflow-hidden text-center max-md:min-w-0 max-md:flex-1 max-md:text-sm md:min-w-56"
          data-testid="slot-label"
        >
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
          className="inline-flex items-center gap-1.5 max-md:px-4 max-md:py-2.5"
        >
          <span className="max-md:sr-only md:hidden">
            {isLast ? "Siguiente cuatrimestre" : "Siguiente"}
          </span>
          <span className="max-md:hidden">{isLast ? "Siguiente cuatrimestre" : "Siguiente"}</span>
          <ChevronRight />
        </Button>
      </div>

      <div className="max-md:flex-1 md:ml-auto" data-testid="status">
        <AnimatePresence mode="wait" initial={false}>
          {warnings > 0 ? (
            <motion.span
              key={`warn-${warnings}`}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ type: "spring", stiffness: 500, damping: 18 }}
              className="inline-block whitespace-nowrap rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-400"
            >
              <Warning /> {warnings}{" "}
              <span className="max-sm:sr-only">
                {warnings === 1 ? "advertencia" : "advertencias"}
              </span>
            </motion.span>
          ) : (
            <motion.span
              key="ok"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ type: "spring", stiffness: 500, damping: 18 }}
              className="inline-block whitespace-nowrap text-sm font-semibold text-green-700 dark:text-green-400"
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
