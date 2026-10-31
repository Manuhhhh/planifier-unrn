import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  APPROVED_SLOT,
  CURRICULUM,
  addCourse,
  canRetake,
  locate,
  problemsFor,
  searchCourses,
} from "planner";
import type { Course, StudyPlan, Year } from "planner";
import { rangeBetween } from "../dragRange.ts";
import { courseMeta, describeProblem, ordinal, slotLabel } from "../labels.ts";
import { useCoarsePointer } from "../hooks/useCoarsePointer.ts";
import { useCourseHover } from "./RelationHover.tsx";
import { SELECTION_SHEET_ROOM, SelectionSheet } from "./SelectionSheet.tsx";
import { CircleX, Warning } from "./icons.tsx";
import { Checkbox, fieldClass, mutedClass, problemClass } from "./ui.tsx";

const byCode = new Map(CURRICULUM.map((course) => [course.code, course]));
const nameOf = (code: string) => byCode.get(code)?.name ?? code;

type Row = { kind: "year"; year: Year } | { kind: "course"; course: Course };

interface Props {
  plan: StudyPlan;
  query: string;
  onlyEnabled: boolean;
  onQueryChange: (query: string) => void;
  onOnlyEnabledChange: (value: boolean) => void;
  onChange: (plan: StudyPlan) => void;
}

const spring = { type: "spring", stiffness: 420, damping: 34 } as const;

export function CourseList({
  plan,
  query,
  onlyEnabled,
  onQueryChange,
  onOnlyEnabledChange,
  onChange,
}: Props) {
  const searching = query.trim() !== "";

  const { rows, hidden } = useMemo(() => {
    const ranked = searchCourses(query, CURRICULUM).filter(
      (code) => locate(plan, code) === undefined || canRetake(plan, code),
    );
    const enabled = ranked.filter(
      (code) => problemsFor(byCode.get(code)!, plan, plan.active, CURRICULUM).length === 0,
    );
    const shown = (onlyEnabled ? enabled : ranked).map((code) => byCode.get(code)!);

    const rows: Row[] = [];
    shown.forEach((course, index) => {
      if (!searching && course.year !== shown[index - 1]?.year) {
        rows.push({ kind: "year", year: course.year });
      }
      rows.push({ kind: "course", course });
    });
    return { rows, hidden: ranked.length - shown.length };
  }, [plan, query, onlyEnabled, searching]);

  // Press on a course and drag over others to add the whole run at once, in list order.
  const order = useMemo(
    () => rows.flatMap((row) => (row.kind === "course" ? [row.course.code] : [])),
    [rows],
  );
  const [drag, setDrag] = useState<{ anchor: string; current: string }>();
  // A drag that ends on another card must not also count as a click on it.
  const dragged = useRef(false);
  const covered = new Set(drag ? rangeBetween(order, drag.anchor, drag.current) : []);

  // With a finger a tap only selects; a sheet shows the courses' relations and asks to confirm.
  const touch = useCoarsePointer();
  const [selected, setSelected] = useState<string[]>([]);
  const chosen = selected.filter((code) => order.includes(code));
  // The selection belongs to the cuatrimestre it was made for.
  useEffect(() => setSelected([]), [plan.active]);
  const toggle = (code: string) =>
    setSelected((codes) =>
      codes.includes(code) ? codes.filter((entry) => entry !== code) : [...codes, code],
    );

  useEffect(() => {
    if (drag === undefined) return;
    const move = (event: PointerEvent) => {
      const code = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest("[data-course]")
        ?.getAttribute("data-course");
      if (code && code !== drag.current) setDrag({ ...drag, current: code });
    };
    const finish = () => {
      const codes = rangeBetween(order, drag.anchor, drag.current);
      if (codes.length > 1) {
        dragged.current = true;
        // The click (if any) follows this pointerup right away; after it, clicks count again.
        setTimeout(() => (dragged.current = false));
        onChange(codes.reduce(addCourse, plan));
      }
      setDrag(undefined);
    };
    const cancel = () => setDrag(undefined);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", cancel);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
    };
  }, [drag, order, plan, onChange]);

  const emptyReason = searching
    ? "Ninguna materia coincide con la búsqueda."
    : onlyEnabled
      ? plan.active === APPROVED_SLOT
        ? "No hay materias habilitadas."
        : "No hay materias habilitadas para este cuatrimestre. Podés dejarlo vacío y pasar al siguiente."
      : "Ya agregaste todas las materias.";

  // The room for the sheet is kept whether or not something is selected, so selecting never moves the list.
  return (
    <div className={touch ? SELECTION_SHEET_ROOM : ""}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar materias (ej. redes, IA)"
          aria-label="Buscar materias"
          className={`${fieldClass} min-w-56 flex-1`}
        />
        <Checkbox checked={onlyEnabled} onChange={onOnlyEnabledChange}>
          Solo habilitadas
        </Checkbox>
      </div>

      <h2 className="mb-3 text-lg font-semibold">
        Materias para{" "}
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={slotLabel(plan, plan.active)}
            className="inline-block"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            {slotLabel(plan, plan.active)}
          </motion.span>
        </AnimatePresence>
      </h2>

      <p className={`-mt-2 mb-3 text-xs ${mutedClass}`}>
        {touch
          ? "Tocá las materias que quieras y confirmá para agregarlas juntas."
          : "Mantené presionado y arrastrá sobre varias materias para agregarlas juntas."}
      </p>

      <motion.div layout className="flex select-none flex-col gap-2">
        <AnimatePresence mode="popLayout" initial={false}>
          {rows.map((row, index) =>
            row.kind === "year" ? (
              <motion.h3
                key={`year-${row.year}`}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                // Not `first:mt-0`: a notice that is still fading out stays in the DOM ahead of the heading and
                // would give it a margin until it is gone, growing the list for a moment.
                className={`text-xs font-semibold uppercase tracking-wide ${index === 0 ? "" : "mt-3"} ${mutedClass}`}
              >
                {ordinal(row.year)} año
              </motion.h3>
            ) : (
              <CourseCard
                key={row.course.code}
                course={row.course}
                plan={plan}
                covered={covered.has(row.course.code) || chosen.includes(row.course.code)}
                onPress={(code) => {
                  dragged.current = false;
                  setDrag({ anchor: code, current: code });
                }}
                onAdd={(code) => {
                  if (dragged.current) {
                    dragged.current = false;
                    return;
                  }
                  if (touch) toggle(code);
                  else onChange(addCourse(plan, code));
                }}
              />
            ),
          )}
          {rows.length === 0 && (hidden === 0 || !searching) && (
            <motion.p
              key="empty"
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={spring}
              className={`text-sm ${mutedClass}`}
            >
              {emptyReason}
            </motion.p>
          )}
          {hidden > 0 && (
            <motion.p
              key="hidden"
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={spring}
              className={`text-sm ${mutedClass}`}
            >
              Hay {hidden} {hidden === 1 ? "materia" : "materias"} más que no están habilitadas.
              Desactivá el filtro para verlas.
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {touch && chosen.length > 0 && (
          <SelectionSheet
            plan={plan}
            codes={chosen}
            onCancel={() => setSelected([])}
            onConfirm={() => {
              onChange(chosen.reduce(addCourse, plan));
              setSelected([]);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CourseCard({
  course,
  plan,
  covered,
  onPress,
  onAdd,
}: {
  course: Course;
  plan: StudyPlan;
  /** Inside the run being dragged over. */
  covered: boolean;
  onPress: (code: string) => void;
  onAdd: (code: string) => void;
}) {
  const hover = useCourseHover(course.code);
  const problems = problemsFor(course, plan, plan.active, CURRICULUM);
  const retake = canRetake(plan, course.code);

  return (
    <motion.button
      type="button"
      {...hover}
      layout
      data-testid="card"
      data-course={course.code}
      // Touch keeps scrolling the list; only a mouse or pen starts a drag.
      onPointerDown={(event) => {
        if (event.pointerType !== "touch" && event.button === 0) onPress(course.code);
      }}
      onClick={() => onAdd(course.code)}
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 48, scale: 0.95 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={spring}
      className={`flex w-full cursor-pointer flex-col items-start gap-0.5 rounded-md border px-3 py-1.5 text-left transition-[border-color,box-shadow] hover:border-red-700 hover:shadow-md dark:hover:border-red-400 ${
        covered
          ? "border-red-700 bg-red-50 ring-2 ring-red-700/30 dark:border-red-400 dark:bg-red-950"
          : problems.length > 0
            ? "border-dashed border-stone-300 bg-stone-50 dark:border-stone-600 dark:bg-stone-900"
            : "border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800"
      }`}
    >
      <span className="font-semibold">{course.name}</span>
      <small className={mutedClass}>{courseMeta(course)}</small>
      {retake && (
        <small className={`font-semibold ${problemClass}`}>
          <CircleX /> Desaprobada: tocala para volver a cursarla acá
        </small>
      )}
      {problems.map((problem) => (
        <small key={JSON.stringify(problem)} className={problemClass}>
          <Warning /> {describeProblem(problem, plan, nameOf)}
        </small>
      ))}
    </motion.button>
  );
}
