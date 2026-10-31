import { AnimatePresence, motion } from "motion/react";
import { emptyPlan } from "planner";
import type { StudyPlan } from "planner";
import { defaultStart, newId } from "../storage.ts";

interface Props {
  plans: StudyPlan[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAdd: (plan: StudyPlan) => void;
}

export function PlanTabs({ plans, selectedId, onSelect, onAdd }: Props) {
  return (
    <nav aria-label="Planes" className="flex flex-wrap gap-2">
      <AnimatePresence initial={false} mode="popLayout">
        {plans.map((plan) => (
          <motion.button
            key={plan.id}
            layout
            type="button"
            aria-current={plan.id === selectedId}
            onClick={() => onSelect(plan.id)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className={`relative cursor-pointer rounded-md border px-3 py-1.5 transition-colors ${
              plan.id === selectedId
                ? "border-red-700 font-semibold dark:border-red-400"
                : "border-stone-200 bg-white hover:border-red-700 dark:border-stone-700 dark:bg-stone-800 dark:hover:border-red-400"
            }`}
          >
            {plan.id === selectedId && (
              <motion.span
                layoutId="tab-pill"
                className="absolute inset-0 rounded-md bg-red-100 dark:bg-red-950"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative">{plan.name}</span>
          </motion.button>
        ))}
      </AnimatePresence>

      <motion.button
        layout
        type="button"
        onClick={() => onAdd(emptyPlan(newId(), `Plan ${plans.length + 1}`, defaultStart()))}
        whileTap={{ scale: 0.95 }}
        className="group relative cursor-pointer rounded-md px-3 py-1.5 text-stone-500 transition-colors hover:text-red-700 dark:text-stone-400 dark:hover:text-red-400"
      >
        {/* The dashed border is an SVG so its dashes can travel around the button on hover. */}
        <svg aria-hidden="true" className="absolute inset-0 size-full overflow-visible">
          <rect
            x="0.5"
            y="0.5"
            rx="6"
            fill="none"
            strokeWidth="1.5"
            strokeDasharray="6 4"
            style={{ width: "calc(100% - 1px)", height: "calc(100% - 1px)" }}
            className="stroke-stone-300 group-hover:animate-march group-hover:stroke-red-700 motion-reduce:animate-none dark:stroke-stone-600 dark:group-hover:stroke-red-400"
          />
        </svg>
        <span className="relative">+ Nuevo plan</span>
      </motion.button>
    </nav>
  );
}
