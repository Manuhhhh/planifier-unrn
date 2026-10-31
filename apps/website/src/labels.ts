import { APPROVED_SLOT, locate, termOf } from "planner";
import type { Course, CourseCode, Problem, StudyPlan } from "planner";

export const ordinal = (n: number) => (n === 1 || n === 3 ? `${n}.er` : `${n}.º`);

export function slotLabel(plan: StudyPlan, slot: number): string {
  if (slot === APPROVED_SLOT) return "Ya aprobadas";
  const { year, term } = termOf(plan, slot);
  return `${year} · ${ordinal(term)} cuatrimestre`;
}

export function courseMeta(course: Course): string {
  const terms = course.terms.map(ordinal).join(" o ");
  return `${course.code} · ${ordinal(course.year)} año · ${terms} cuatri · ${course.hours} h`;
}

/** Spanish explanation of why a course does not fit where it is (or would be) placed. */
export function describeProblem(
  problem: Problem,
  plan: StudyPlan,
  nameOf: (code: CourseCode) => string,
): string {
  switch (problem.kind) {
    case "term":
      return `Se dicta sólo en el ${problem.offeredIn.map(ordinal).join(" o ")} cuatrimestre`;
    case "year":
      return `Requiere tener aprobadas las materias hasta ${ordinal(problem.year)} año`;
    case "regular":
    case "approved": {
      const what = problem.kind === "regular" ? "la cursada aprobada de" : "el final aprobado de";
      const where = locate(plan, problem.code);
      const detail =
        where === undefined
          ? "no está en tu plan"
          : plan.failed?.includes(problem.code)
            ? `la desaprobaste en ${slotLabel(plan, where)}`
            : `está en ${slotLabel(plan, where)} y tiene que estar antes`;
      return `Falta ${what} ${nameOf(problem.code)} (${detail})`;
    }
  }
}
