import type { Course, CourseCode } from "./types.ts";

export interface Relation {
  code: CourseCode;
  /** "regular" needs the cursada; "approved" needs the final passed. */
  kind: "regular" | "approved";
}

/** What `code` needs before it can be taken, and which courses it helps unlock. */
export function relationsOf(
  code: CourseCode,
  curriculum: readonly Course[],
): { requires: Relation[]; enables: Relation[] } {
  const kindOf = (course: Course, other: CourseCode): Relation["kind"] | undefined => {
    if (course.correlatives.enrollApproved.includes(other)) return "approved";
    if (course.correlatives.enrollRegular.includes(other)) return "regular";
    return undefined;
  };

  const course = curriculum.find((entry) => entry.code === code);
  const requires: Relation[] = course
    ? [
        ...course.correlatives.enrollRegular.map((other): Relation => ({
          code: other,
          kind: "regular",
        })),
        ...course.correlatives.enrollApproved.map((other): Relation => ({
          code: other,
          kind: "approved",
        })),
      ]
    : [];

  const enables = curriculum.flatMap((dependent) => {
    const kind = kindOf(dependent, code);
    return kind ? [{ code: dependent.code, kind }] : [];
  });

  return { requires, enables };
}
