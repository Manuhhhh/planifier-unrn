import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import {
  APPROVED_SLOT,
  CURRICULUM,
  clearSlot,
  goTo,
  planProblems,
  rearrange,
  removeCourse,
  removeTerm,
  slotCourses,
  toggleFailed,
} from "planner";
import type { PlanProblem, StudyPlan } from "planner";
import { describeProblem, slotLabel } from "../labels.ts";
import { useConfirm } from "./Confirm.tsx";
import { CircleX, Close, Eraser, Shuffle, Warning } from "./icons.tsx";
import { useCourseHover } from "./RelationHover.tsx";
import { Button, IconButton, mutedClass, problemClass } from "./ui.tsx";

const byCode = new Map(CURRICULUM.map((course) => [course.code, course]));
const nameOf = (code: string) => byCode.get(code)?.name ?? code;

const spring = { type: "spring", stiffness: 420, damping: 34 } as const;

interface Props {
  plan: StudyPlan;
  onChange: (plan: StudyPlan) => void;
}

export function PlanPanel({ plan, onChange }: Props) {
  const problems = planProblems(plan, CURRICULUM);
  const slots = [APPROVED_SLOT, ...plan.terms.keys()];
  const failed = plan.failed?.length ?? 0;
  const [note, setNote] = useState<string>();
  useEffect(() => {
    if (note === undefined) return;
    const timer = setTimeout(() => setNote(undefined), 8000);
    return () => clearTimeout(timer);
  }, [note]);

  const rearrangePlan = () => {
    const { plan: next, moved } = rearrange(plan, CURRICULUM);
    onChange(next);
    const count = `${moved.length} ${moved.length === 1 ? "materia" : "materias"}`;
    setNote(
      `Se reacomodaron ${count}. El plan termina en ${slotLabel(next, next.terms.length - 1)}.`,
    );
  };

  return (
    <div data-guide="plan-panel">
      {failed > 0 && (
        // Zero-height sticky row: the button floats at the top right of the panel while its content scrolls.
        <div className="pointer-events-none sticky top-2 z-10 flex h-0 items-start justify-end">
          <Button
            onClick={rearrangePlan}
            className="pointer-events-auto flex items-center gap-1.5 shadow-md"
          >
            <Shuffle /> Reacomodar
          </Button>
        </div>
      )}
      <h2 className="mb-3 flex min-h-9 items-center text-lg font-semibold">Tu plan</h2>
      {failed > 0 && (
        <p className={`-mt-1 mb-3 text-xs ${mutedClass}`}>
          Las materias que dependen de una desaprobada quedan con advertencia. «Reacomodar» las
          vuelve a ubicar lo antes posible, sin cargar de más ningún cuatrimestre.
        </p>
      )}
      {note && (
        <p role="status" className={`mb-3 text-sm ${mutedClass}`}>
          {note}
        </p>
      )}
      <AnimatePresence mode="popLayout" initial={false}>
        {slots.map((slot) => (
          <Slot key={slot} plan={plan} slot={slot} problems={problems} onChange={onChange} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function Slot({
  plan,
  slot,
  problems,
  onChange,
}: Props & { slot: number; problems: PlanProblem[] }) {
  const confirm = useConfirm();
  const courses = slotCourses(plan, slot);
  const hours = courses.reduce((sum, code) => sum + (byCode.get(code)?.hours ?? 0), 0);
  const count = `${courses.length} ${courses.length === 1 ? "materia" : "materias"}`;
  const removable = slot !== APPROVED_SLOT && plan.terms.length > 1;
  const active = slot === plan.active;

  const removeThisTerm = async () => {
    const confirmed =
      courses.length === 0 ||
      (await confirm({
        title: `¿Quitar ${slotLabel(plan, slot)}?`,
        message: `Se quitan también sus ${count} del plan.`,
        confirmLabel: "Quitar cuatrimestre",
      }));
    if (confirmed) onChange(removeTerm(plan, slot));
  };

  const clearThisSlot = async () => {
    const confirmed = await confirm({
      title: `¿Vaciar ${slotLabel(plan, slot)}?`,
      message: `Se quitan sus ${count} del plan. El cuatrimestre queda vacío.`,
      confirmLabel: "Vaciar cuatrimestre",
    });
    if (confirmed) onChange(clearSlot(plan, slot));
  };

  return (
    <motion.article
      layout
      data-testid="slot"
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={spring}
      className={`relative mb-3 overflow-hidden rounded-lg border border-stone-200 px-3 py-2.5 pl-4 transition-colors duration-300 dark:border-stone-700 ${
        active ? "bg-red-100 dark:bg-red-950" : ""
      }`}
    >
      {active && (
        <motion.span
          layoutId="active-slot-bar"
          className="absolute inset-y-0 left-0 w-1 bg-red-700 dark:bg-red-400"
          transition={spring}
        />
      )}
      <div className="flex flex-wrap items-center gap-x-2">
        <button
          type="button"
          onClick={() => onChange(goTo(plan, slot))}
          className="cursor-pointer text-left font-semibold transition-colors hover:text-red-700 max-md:py-1.5 dark:hover:text-red-400"
        >
          {slotLabel(plan, slot)}
        </button>
        <small className={`mr-auto ${mutedClass}`}>
          {slot === APPROVED_SLOT ? count : `${count} · ${hours} h`}
        </small>
        {courses.length > 0 && (
          <IconButton
            spin={false}
            title="Vaciar"
            aria-label={`Vaciar ${slotLabel(plan, slot)}`}
            onClick={clearThisSlot}
          >
            <Eraser />
          </IconButton>
        )}
        {removable && (
          <IconButton
            title="Quitar"
            aria-label={`Quitar ${slotLabel(plan, slot)}`}
            onClick={removeThisTerm}
          >
            <Close />
          </IconButton>
        )}
      </div>

      <ul className="mt-1.5">
        <AnimatePresence mode="popLayout" initial={false}>
          {courses.map((code) => (
            <PlannedCourse
              key={code}
              code={code}
              slot={slot}
              issues={problems.find((entry) => entry.slot === slot && entry.code === code)}
              plan={plan}
              onChange={onChange}
            />
          ))}
          {courses.length === 0 && (
            <motion.li
              key="empty"
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`text-sm ${mutedClass}`}
            >
              Vacío
            </motion.li>
          )}
        </AnimatePresence>
      </ul>
    </motion.article>
  );
}

function PlannedCourse({
  code,
  slot,
  issues,
  plan,
  onChange,
}: {
  code: string;
  slot: number;
  issues: PlanProblem | undefined;
  plan: StudyPlan;
  onChange: (plan: StudyPlan) => void;
}) {
  const hover = useCourseHover(code);
  const failed = plan.failed?.includes(code) ?? false;

  return (
    <motion.li
      {...hover}
      layout
      data-testid="planned"
      data-warning={issues ? "" : undefined}
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={spring}
      // The box lights up under the mouse (or keyboard focus), so it is clear which course the diagram is about.
      className={`relative mb-1 flex flex-wrap items-center gap-x-2 rounded-md border px-2 py-1 transition-[background-color,border-color,box-shadow] duration-150 hover:border-red-700 hover:bg-red-50 hover:shadow-[0_0_14px_rgb(185_28_28/0.35)] focus-within:border-red-700 focus-within:bg-red-50 dark:hover:border-red-400 dark:hover:bg-red-950/60 dark:hover:shadow-[0_0_14px_rgb(248_113_113/0.35)] dark:focus-within:border-red-400 dark:focus-within:bg-red-950/60 ${
        issues
          ? "border-transparent border-l-[3px] border-l-amber-600 hover:border-l-amber-600 dark:border-l-amber-400 dark:hover:border-l-amber-400"
          : "border-transparent"
      }`}
    >
      {/* New courses flash red as they land so the eye follows them from the list. */}
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-md bg-red-600"
        initial={{ opacity: 0.25 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.9 }}
      />
      <span className="relative min-w-0 flex-1 font-medium max-md:py-1.5">
        <span className={failed ? "text-stone-500 line-through dark:text-stone-400" : ""}>
          {nameOf(code)}
        </span>
        {failed && (
          <small className={`ml-2 font-semibold no-underline ${problemClass}`}>Desaprobada</small>
        )}
      </span>
      {slot !== APPROVED_SLOT && (
        <IconButton
          spin={false}
          aria-pressed={failed}
          title={failed ? "Quitar la marca de desaprobada" : "Marcar como desaprobada"}
          aria-label={
            failed
              ? `Quitar la marca de desaprobada de ${nameOf(code)}`
              : `Marcar ${nameOf(code)} como desaprobada`
          }
          onClick={() => onChange(toggleFailed(plan, code))}
          className={failed ? "text-amber-700 dark:text-amber-400" : ""}
        >
          <CircleX />
        </IconButton>
      )}
      <IconButton
        aria-label={`Quitar ${nameOf(code)}`}
        onClick={() => onChange(removeCourse(plan, code))}
      >
        <Close />
      </IconButton>
      {issues?.problems.map((problem) => (
        <motion.small
          key={JSON.stringify(problem)}
          className={`basis-full ${problemClass}`}
          initial={{ opacity: 0, x: 0 }}
          animate={{ opacity: 1, x: [0, -5, 5, -3, 3, 0] }}
          transition={{ duration: 0.45 }}
        >
          <Warning /> {describeProblem(problem, plan, nameOf)}
        </motion.small>
      ))}
    </motion.li>
  );
}
