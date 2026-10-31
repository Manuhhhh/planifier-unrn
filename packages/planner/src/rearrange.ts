import { problemsFor, withFailed } from "./plan.ts";
import type { StudyPlan } from "./plan.ts";
import type { Blocker, Course, CourseCode } from "./types.ts";

export interface Rearranged {
  plan: StudyPlan;
  /** Courses that changed cuatrimestre, in the order the plan now has them. */
  moved: { code: CourseCode; from: number; to: number }[];
}

/**
 * Plans the failed courses again. Everything up to the cuatrimestre of the first failure stays
 * as it was; from there on, each course goes to the earliest cuatrimestre where it fits:
 * not before the one it was in (nothing is pulled earlier), after the failed cuatrimestre if it
 * failed, with its correlatives passed before and in a cuatrimestre where it is given. A
 * cuatrimestre holds no more courses than the fullest one the student had planned, so the extra
 * load is not piled up in one. When it is full, the course that unlocks the longest chain goes
 * first, then the ones that did not fail, so the plan ends as soon as it can and as few courses
 * as possible leave their place. A correlative that is not in the plan at all cannot be fixed by
 * moving things, so it does not hold a course back.
 */
export function rearrange(plan: StudyPlan, curriculum: readonly Course[]): Rearranged {
  const slotOf = new Map<CourseCode, number>();
  plan.terms.forEach((courses, slot) => courses.forEach((code) => slotOf.set(code, slot)));
  const failed = (plan.failed ?? []).filter((code) => slotOf.has(code));
  if (failed.length === 0) return { plan: withFailed(plan, []), moved: [] };

  const byCode = new Map(curriculum.map((course) => [course.code, course]));
  const order = new Map(curriculum.map((course, index) => [course.code, index]));
  const planned = new Set<CourseCode>([...plan.approved, ...slotOf.keys()]);

  const lastFixed = Math.min(...failed.map((code) => slotOf.get(code)!));
  const pending = [...slotOf.keys()].filter(
    (code) => failed.includes(code) || slotOf.get(code)! > lastFixed,
  );
  const isPending = new Set(pending);

  // How many courses, one after the other, wait on this one.
  const chain = new Map<CourseCode, number>();
  const chainOf = (code: CourseCode): number => {
    const known = chain.get(code);
    if (known !== undefined) return known;
    chain.set(code, 0);
    const length = pending
      .filter((other) => {
        const { enrollRegular, enrollApproved } = byCode.get(other)?.correlatives ?? {};
        return enrollRegular?.includes(code) || enrollApproved?.includes(code);
      })
      .reduce((longest, other) => Math.max(longest, 1 + chainOf(other)), 0);
    chain.set(code, length);
    return length;
  };

  const earliest = (code: CourseCode) =>
    failed.includes(code) ? slotOf.get(code)! + 1 : slotOf.get(code)!;
  const priority = (a: CourseCode, b: CourseCode) =>
    chainOf(b) - chainOf(a) ||
    Number(failed.includes(a)) - Number(failed.includes(b)) ||
    slotOf.get(a)! - slotOf.get(b)! ||
    (order.get(a) ?? 0) - (order.get(b) ?? 0);

  // Only a blocker that planning can resolve holds a course back.
  const fixable = (blocker: Blocker) =>
    blocker.kind === "year"
      ? curriculum.filter((c) => c.year <= blocker.year).every((c) => planned.has(c.code))
      : planned.has(blocker.code);

  const capacity = Math.max(1, ...plan.terms.map((courses) => courses.length));
  const terms = plan.terms
    .slice(0, lastFixed + 1)
    .map((courses) => courses.filter((code) => !failed.includes(code)));
  const todo = new Set(pending);
  const waiting = [...pending].sort(priority);

  for (let slot = lastFixed + 1; todo.size > 0; slot++) {
    const placed: CourseCode[] = [];
    // Past every reasonable wait, what is left goes in as is rather than looping for ever.
    const stuck = slot > lastFixed + 2 * pending.length + 8;
    const draft: StudyPlan = { ...plan, terms: [...terms, placed], failed: undefined };
    for (const code of waiting) {
      if (placed.length >= capacity && !stuck) break;
      if (!todo.has(code) || (!stuck && earliest(code) > slot)) continue;
      const course = byCode.get(code);
      const blocked = course
        ? problemsFor(course, draft, slot, curriculum).filter(
            (problem) => problem.kind === "term" || fixable(problem),
          )
        : [];
      if (blocked.length > 0 && !stuck) continue;
      placed.push(code);
      todo.delete(code);
    }
    terms.push(placed);
  }

  while (terms.length > 1 && terms.at(-1)!.length === 0) terms.pop();
  const next = withFailed({ ...plan, terms, active: Math.min(plan.active, terms.length - 1) }, []);
  const moved = terms
    .flatMap((courses, to) => courses.map((code) => ({ code, from: slotOf.get(code)!, to })))
    .filter((entry) => isPending.has(entry.code) && entry.from !== entry.to);
  return { plan: next, moved };
}
