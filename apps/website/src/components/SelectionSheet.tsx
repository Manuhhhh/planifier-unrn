import { motion } from "motion/react";
import { CURRICULUM } from "planner";
import type { CourseCode, StudyPlan } from "planner";
import { RelationDiagram } from "./RelationHover.tsx";
import { Button } from "./ui.tsx";

const nameOf = (code: CourseCode) =>
  CURRICULUM.find((course) => course.code === code)?.name ?? code;

/** Room the sheet takes at the bottom of the list on a phone, so the last courses can still be reached. */
export const SELECTION_SHEET_ROOM = "max-md:pb-96";

/**
 * On a phone a tap selects a course instead of adding it. This sheet floats above the
 * cuatrimestre bar with what the last selected course needs and enables, so it can be judged
 * before anything is added, and with the button that confirms.
 */
export function SelectionSheet({
  plan,
  codes,
  onConfirm,
  onCancel,
}: {
  plan: StudyPlan;
  /** Selected courses, the last one tapped last. */
  codes: CourseCode[];
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const shown = codes.at(-1)!;
  return (
    <motion.div
      role="region"
      aria-label="Materias seleccionadas"
      className="fixed inset-x-3 bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+4.75rem)] z-30 flex max-h-[55dvh] flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-2xl md:inset-x-auto md:right-6 md:bottom-6 md:w-md dark:border-stone-700 dark:bg-stone-800"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
    >
      <p className="truncate font-semibold">{nameOf(shown)}</p>
      <div className="min-h-0 overflow-auto rounded-[10px] border border-stone-200 dark:border-stone-700">
        <RelationDiagram key={shown} code={shown} plan={plan} />
      </div>
      <div className="flex gap-2">
        <Button onClick={onCancel} className="flex-1 py-2.5">
          Cancelar
        </Button>
        <Button variant="danger" onClick={onConfirm} className="flex-[2] py-2.5 font-semibold">
          {codes.length === 1 ? "Agregar materia" : `Agregar ${codes.length} materias`}
        </Button>
      </div>
    </motion.div>
  );
}
