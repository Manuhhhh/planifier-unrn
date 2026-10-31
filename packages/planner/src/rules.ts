import type { Blocker, Course, Progress } from "./types.ts";

const isRegular = (progress: Progress, code: string) =>
  progress[code] === "regular" || progress[code] === "approved";

const isApproved = (progress: Progress, code: string) => progress[code] === "approved";

/** Everything missing before the course can be taken; empty when it can. */
export function enrollBlockers(
  course: Course,
  progress: Progress,
  curriculum: readonly Course[],
): Blocker[] {
  const { enrollRegular, enrollApproved } = course.correlatives;
  const blockers: Blocker[] = [
    ...enrollRegular
      .filter((code) => !isRegular(progress, code))
      .map((code): Blocker => ({ kind: "regular", code })),
    ...enrollApproved
      .filter((code) => !isApproved(progress, code))
      .map((code): Blocker => ({ kind: "approved", code })),
  ];

  const { plannedAfterYear } = course;
  if (
    plannedAfterYear !== undefined &&
    curriculum
      .filter((other) => other.year <= plannedAfterYear)
      .some((other) => !isApproved(progress, other.code))
  ) {
    blockers.push({ kind: "year", year: plannedAfterYear });
  }
  return blockers;
}

/** Whether the student can enroll in a course they have not taken yet. */
export function canEnroll(
  course: Course,
  progress: Progress,
  curriculum: readonly Course[],
): boolean {
  return (
    progress[course.code] === undefined && enrollBlockers(course, progress, curriculum).length === 0
  );
}
