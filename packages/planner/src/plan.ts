import { enrollBlockers } from "./rules.ts";
import type { Blocker, Course, CourseCode, Progress, Term } from "./types.ts";

/** Slot of the courses the student has already approved, before the first cuatrimestre. */
export const APPROVED_SLOT = -1;

/**
 * A plan the student builds by hand. Slots are the approved bucket (`APPROVED_SLOT`) and
 * the cuatrimestres in `terms`. Everything in an earlier slot counts as approved by the
 * time a later one starts, so it is assumed the student passes each final.
 */
export interface StudyPlan {
  id: string;
  name: string;
  /** Calendar year of the first cuatrimestre. */
  startYear: number;
  startTerm: Term;
  approved: CourseCode[];
  terms: CourseCode[][];
  /**
   * Courses of `terms` the student took and did not pass. They stay where they were taken, but
   * do not count as approved for what comes after, until `rearrange` plans them again.
   */
  failed?: CourseCode[];
  /** Slot that receives new courses. */
  active: number;
}

export type Problem = Blocker | { kind: "term"; offeredIn: readonly Term[] };

export interface PlanProblem {
  slot: number;
  code: CourseCode;
  problems: Problem[];
}

export function emptyPlan(
  id: string,
  name: string,
  start: { year: number; term: Term },
): StudyPlan {
  return {
    id,
    name,
    startYear: start.year,
    startTerm: start.term,
    approved: [],
    terms: [[]],
    active: 0,
  };
}

/** Calendar year and cuatrimestre of the term at `index`. */
export function termOf(plan: StudyPlan, index: number): { year: number; term: Term } {
  const offset = (plan.startTerm === 2 ? 1 : 0) + index;
  return { year: plan.startYear + Math.floor(offset / 2), term: offset % 2 === 0 ? 1 : 2 };
}

export function slotCourses(plan: StudyPlan, slot: number): CourseCode[] {
  return slot === APPROVED_SLOT ? plan.approved : (plan.terms[slot] ?? []);
}

/** Slot where the course is planned, if any. */
export function locate(plan: StudyPlan, code: CourseCode): number | undefined {
  if (plan.approved.includes(code)) return APPROVED_SLOT;
  const index = plan.terms.findIndex((courses) => courses.includes(code));
  return index === -1 ? undefined : index;
}

/** The plan with `failed` set to `codes`; the field is left out when no course failed. */
export function withFailed(plan: StudyPlan, codes: readonly CourseCode[]): StudyPlan {
  const { failed: _, ...rest } = plan;
  return codes.length === 0 ? rest : { ...rest, failed: [...codes] };
}

/** Marks a planned course as failed, or takes the mark off; courses outside a cuatrimestre are ignored. */
export function toggleFailed(plan: StudyPlan, code: CourseCode): StudyPlan {
  const failed = plan.failed ?? [];
  if (failed.includes(code))
    return withFailed(
      plan,
      failed.filter((entry) => entry !== code),
    );
  const slot = locate(plan, code);
  return slot === undefined || slot === APPROVED_SLOT ? plan : withFailed(plan, [...failed, code]);
}

/** What the student is assumed to have by the time `slot` starts: what was passed, not what failed. */
function progressBefore(plan: StudyPlan, slot: number): Progress {
  const done = (
    slot === APPROVED_SLOT ? plan.approved : [...plan.approved, ...plan.terms.slice(0, slot).flat()]
  ).filter((code) => !plan.failed?.includes(code));
  return Object.fromEntries(done.map((code) => [code, "approved" as const]));
}

/** What keeps the course from being coherent in `slot`; empty when it fits. */
export function problemsFor(
  course: Course,
  plan: StudyPlan,
  slot: number,
  curriculum: readonly Course[],
): Problem[] {
  const problems: Problem[] = enrollBlockers(course, progressBefore(plan, slot), curriculum);
  if (slot !== APPROVED_SLOT && !course.terms.includes(termOf(plan, slot).term)) {
    problems.push({ kind: "term", offeredIn: course.terms });
  }
  return problems;
}

/** Every planned course that is not coherent where it was placed. */
export function planProblems(plan: StudyPlan, curriculum: readonly Course[]): PlanProblem[] {
  const byCode = new Map(curriculum.map((course) => [course.code, course]));
  const flagged: PlanProblem[] = [];
  for (let slot = APPROVED_SLOT; slot < plan.terms.length; slot++) {
    for (const code of slotCourses(plan, slot)) {
      const course = byCode.get(code);
      const problems = course ? problemsFor(course, plan, slot, curriculum) : [];
      if (problems.length > 0) flagged.push({ slot, code, problems });
    }
  }
  return flagged;
}

/** Adds the course to the active slot; does nothing if it is already planned. */
export function addCourse(plan: StudyPlan, code: CourseCode): StudyPlan {
  if (locate(plan, code) !== undefined) return plan;
  if (plan.active === APPROVED_SLOT) return { ...plan, approved: [...plan.approved, code] };
  return {
    ...plan,
    terms: plan.terms.map((courses, index) =>
      index === plan.active ? [...courses, code] : courses,
    ),
  };
}

export function removeCourse(plan: StudyPlan, code: CourseCode): StudyPlan {
  return withFailed(
    {
      ...plan,
      approved: plan.approved.filter((entry) => entry !== code),
      terms: plan.terms.map((courses) => courses.filter((entry) => entry !== code)),
    },
    (plan.failed ?? []).filter((entry) => entry !== code),
  );
}

export function goTo(plan: StudyPlan, slot: number): StudyPlan {
  return { ...plan, active: Math.min(Math.max(slot, APPROVED_SLOT), plan.terms.length - 1) };
}

/**
 * Moves the active slot one step. Stepping forward past the last cuatrimestre opens a new
 * one, even if the current one is empty: a cuatrimestre may be left without courses. Stepping
 * back from an empty last cuatrimestre drops it, so no trailing empty one is left behind.
 */
export function stepSlot(plan: StudyPlan, delta: 1 | -1): StudyPlan {
  const next = plan.active + delta;
  const last = plan.terms.length - 1;
  if (delta === -1 && plan.active === last && last > 0 && plan.terms[last]!.length === 0) {
    return { ...removeTerm(plan, last), active: next };
  }
  if (next < plan.terms.length) return goTo(plan, next);
  return { ...plan, terms: [...plan.terms, []], active: next };
}

/** Removes the courses of one slot (a cuatrimestre or the approved bucket), keeping the slot itself. */
export function clearSlot(plan: StudyPlan, slot: number): StudyPlan {
  if (slot === APPROVED_SLOT) return { ...plan, approved: [] };
  const cleared = plan.terms[slot] ?? [];
  return withFailed(
    { ...plan, terms: plan.terms.map((courses, index) => (index === slot ? [] : courses)) },
    (plan.failed ?? []).filter((code) => !cleared.includes(code)),
  );
}

/** Drops a cuatrimestre with its courses, always keeping at least one. */
export function removeTerm(plan: StudyPlan, index: number): StudyPlan {
  const terms = plan.terms.filter((_, position) => position !== index);
  const kept = terms.length > 0 ? terms : [[]];
  const dropped = plan.terms[index] ?? [];
  return withFailed(
    { ...plan, terms: kept, active: Math.min(plan.active, kept.length - 1) },
    (plan.failed ?? []).filter((code) => !dropped.includes(code)),
  );
}

/** Removes every course and goes back to a single empty cuatrimestre; name and start are kept. */
export function clearPlan(plan: StudyPlan): StudyPlan {
  return withFailed({ ...plan, approved: [], terms: [[]], active: 0 }, []);
}
