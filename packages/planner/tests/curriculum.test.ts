import { describe, expect, test } from "vite-plus/test";
import { CURRICULUM } from "../src/curriculum.ts";
import type { Course } from "../src/types.ts";

const byCode = new Map(CURRICULUM.map((course) => [course.code, course]));
const position = (course: Course) => (course.year - 1) * 2 + Math.min(...course.terms);

function referencedCodes(course: Course) {
  const { enrollRegular, enrollApproved, finalApproved } = course.correlatives;
  return [...enrollRegular, ...enrollApproved, ...finalApproved];
}

describe("curriculum data", () => {
  test("has the 38 courses of the plan with unique codes", () => {
    expect(CURRICULUM).toHaveLength(38);
    expect(byCode.size).toBe(38);
  });

  // The plan PDF prints 672 for year 2 and 3224 in total; its own rows add up to the
  // 3208 hours stated in Res. CSDEyVE 015/22.
  test("adds up to the 3208 hours of the resolution", () => {
    const hoursOfYear = (year: number) =>
      CURRICULUM.filter((course) => course.year === year).reduce(
        (total, course) => total + course.hours,
        0,
      );

    expect([1, 2, 3, 4, 5].map(hoursOfYear)).toEqual([624, 656, 672, 560, 696]);
    expect(CURRICULUM.reduce((total, course) => total + course.hours, 0)).toBe(3208);
  });

  test("only references courses that exist", () => {
    for (const course of CURRICULUM) {
      for (const code of referencedCodes(course)) {
        expect(byCode.has(code), `${course.code} references unknown ${code}`).toBe(true);
      }
    }
  });

  test("every prerequisite is offered before the course that needs it", () => {
    for (const course of CURRICULUM) {
      for (const code of referencedCodes(course)) {
        const prerequisite = byCode.get(code)!;
        expect(position(prerequisite), `${code} -> ${course.code}`).toBeLessThan(position(course));
      }
    }
  });

  test("keeps the official correlatives of a course with all three requirement kinds", () => {
    expect(byCode.get("V1372")!.correlatives).toEqual({
      enrollRegular: ["V1294", "V1296", "V1223"],
      enrollApproved: ["V1293"],
      finalApproved: ["V1294", "V1296", "V1223"],
    });
  });

  test("leaves the first-year entry courses without correlatives", () => {
    for (const code of ["V1280", "V1250", "V1281", "V1282", "L0002"]) {
      expect(byCode.get(code)!.correlatives).toEqual({
        enrollRegular: [],
        enrollApproved: [],
        finalApproved: [],
      });
    }
  });
});
