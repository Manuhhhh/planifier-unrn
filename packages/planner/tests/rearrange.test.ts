import { describe, expect, test } from "vite-plus/test";
import { CURRICULUM } from "../src/curriculum.ts";
import {
  addCourse,
  canRetake,
  emptyPlan,
  goTo,
  locate,
  planProblems,
  problemsFor,
  removeCourse,
  toggleFailed,
} from "../src/plan.ts";
import type { StudyPlan } from "../src/plan.ts";
import { rearrange } from "../src/rearrange.ts";

const start = { year: 2027, term: 1 as const };
const plan = (overrides: Partial<StudyPlan>): StudyPlan => ({
  ...emptyPlan("p", "Plan", start),
  ...overrides,
});
const failing = (p: StudyPlan, ...codes: string[]) => codes.reduce(toggleFailed, p);

// V1281 (Matemática I) is given in the 1st cuatrimestre; V1283 needs it and is given in the 2nd.
const chain = plan({ terms: [["V1281"], ["V1283"]] });

describe("toggleFailed", () => {
  test("marks a planned course as failed and unmarks it again", () => {
    const marked = toggleFailed(chain, "V1281");
    expect(marked.failed).toEqual(["V1281"]);
    expect(toggleFailed(marked, "V1281").failed ?? []).toEqual([]);
  });

  test("ignores courses that are not in a cuatrimestre", () => {
    expect(toggleFailed(chain, "V1250")).toBe(chain);
    const approved = plan({ approved: ["V1250"] });
    expect(toggleFailed(approved, "V1250")).toBe(approved);
  });

  test("a failed course no longer counts as approved for what comes after", () => {
    expect(planProblems(chain, CURRICULUM)).toEqual([]);
    const flagged = planProblems(toggleFailed(chain, "V1281"), CURRICULUM);
    expect(flagged).toMatchObject([{ slot: 1, code: "V1283" }]);
    expect(
      problemsFor(
        CURRICULUM.find((c) => c.code === "V1283")!,
        chain,
        1,
        CURRICULUM,
      ),
    ).toEqual([]);
  });

  test("removing a failed course forgets the mark", () => {
    expect(removeCourse(toggleFailed(chain, "V1281"), "V1281").failed ?? []).toEqual([]);
  });
});

describe("rearrange", () => {
  test("leaves a plan without failed courses as it is", () => {
    expect(rearrange(chain, CURRICULUM)).toEqual({ plan: chain, moved: [] });
  });

  test("retakes the course when it is next given and moves what needs it right after", () => {
    const { plan: next, moved } = rearrange(failing(chain, "V1281"), CURRICULUM);
    expect(next.terms).toEqual([[], [], ["V1281"], ["V1283"]]);
    expect(next.failed ?? []).toEqual([]);
    expect(moved).toEqual([
      { code: "V1281", from: 0, to: 2 },
      { code: "V1283", from: 1, to: 3 },
    ]);
    expect(planProblems(next, CURRICULUM)).toEqual([]);
  });

  test("does not move courses the failure does not touch", () => {
    const wide = plan({
      terms: [
        ["V1281", "V1282"],
        ["V1283", "V1284"],
      ],
    });
    const { plan: next } = rearrange(failing(wide, "V1281"), CURRICULUM);
    expect(next.terms[0]).toEqual(["V1282"]);
    expect(next.terms[1]).toEqual(["V1284"]);
    expect(next.terms[2]).toEqual(["V1281"]);
    expect(next.terms[3]).toEqual(["V1283"]);
  });

  test("keeps the courses taken before the failure and never pulls later ones earlier", () => {
    const long = plan({ terms: [["V1280"], [], ["V1281"], ["V1283"]] });
    const { plan: next } = rearrange(failing(long, "V1281"), CURRICULUM);
    const slotOf = (code: string) => next.terms.findIndex((term) => term.includes(code));
    expect(next.terms[0]).toEqual(["V1280"]);
    expect(slotOf("V1281")).toBe(4);
    expect(slotOf("V1283")).toBe(5);
    expect(next.terms.slice(1, 4)).toEqual([[], [], []]);
  });

  test("gives the course that unlocks others the place when a cuatrimestre is full", () => {
    const full = plan({ terms: [["V1281"], ["V1283"], ["V1280", "V1250", "V1282"]] });
    const { plan: next } = rearrange(failing(full, "V1281"), CURRICULUM);
    const slotOf = (code: string) => next.terms.findIndex((term) => term.includes(code));
    expect(slotOf("V1281")).toBe(2);
    expect(slotOf("V1283")).toBe(3);
    expect(next.terms[2]).toHaveLength(3);
    expect(slotOf("V1282")).toBe(4);
    expect(Math.max(...next.terms.map((term) => term.length))).toBe(3);
  });

  test("drops the empty cuatrimestres left at the end and keeps the active one valid", () => {
    const solo = plan({ terms: [["V1281"], []], active: 1 });
    const { plan: next } = rearrange(failing(solo, "V1281"), CURRICULUM);
    expect(next.terms).toEqual([[], [], ["V1281"]]);
    expect(next.active).toBeLessThan(next.terms.length);
  });

  test("keeps a course whose requirements are not in the plan where it was", () => {
    // V1284 needs V1282 and V1280, neither planned: nothing the planner moves can fix that.
    const lonely = plan({ terms: [["V1281"], ["V1284"]] });
    const { plan: next } = rearrange(failing(lonely, "V1281"), CURRICULUM);
    expect(next.terms[1]).toEqual(["V1284"]);
  });
});

describe("rearranging and retaking", () => {
  const twoFailed = failing(
    plan({ terms: [["V1281", "V1282"], ["V1283"], [], []] }),
    "V1281",
    "V1282",
  );

  test("puts a failed course where retaking it by hand would have been allowed", () => {
    const { plan: next, moved } = rearrange(twoFailed, CURRICULUM);
    for (const { code, from, to } of moved.filter((m) => twoFailed.failed!.includes(m.code))) {
      expect(canRetake(goTo(twoFailed, to), code)).toBe(true);
      expect(to).toBeGreaterThan(from);
      const course = CURRICULUM.find((entry) => entry.code === code)!;
      expect(problemsFor(course, next, to, CURRICULUM)).toEqual([]);
    }
  });

  test("leaves a course that was retaken by hand where it was put", () => {
    // V1281 is given in the 1st cuatrimestre: slot 2 is the first one that can take it again.
    const retaken = addCourse(goTo(twoFailed, 2), "V1281");
    expect(retaken.failed).toEqual(["V1282"]);
    const { plan: next, moved } = rearrange(retaken, CURRICULUM);
    expect(locate(next, "V1281")).toBe(2);
    expect(moved.map((entry) => entry.code)).not.toContain("V1281");
    expect(locate(next, "V1282")).toBeGreaterThan(0);
  });
});
