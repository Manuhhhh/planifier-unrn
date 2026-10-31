import { describe, expect, test } from "vite-plus/test";
import { CURRICULUM } from "../src/curriculum.ts";
import {
  APPROVED_SLOT,
  addCourse,
  clearPlan,
  clearSlot,
  emptyPlan,
  goTo,
  locate,
  planProblems,
  problemsFor,
  removeCourse,
  removeTerm,
  stepSlot,
  termOf,
} from "../src/plan.ts";
import type { StudyPlan } from "../src/plan.ts";

const course = (code: string) => CURRICULUM.find((entry) => entry.code === code)!;
const fresh = (startTerm: 1 | 2 = 1) => emptyPlan("p1", "Plan 1", { year: 2027, term: startTerm });
const plan = (overrides: Partial<StudyPlan>): StudyPlan => ({ ...fresh(), ...overrides });
const enabled = (p: StudyPlan, slot: number) =>
  CURRICULUM.filter(
    (entry) =>
      locate(p, entry.code) === undefined && problemsFor(entry, p, slot, CURRICULUM).length === 0,
  ).map((entry) => entry.code);

describe("termOf", () => {
  test("alternates cuatrimestres and advances the calendar year after the second", () => {
    const labels = [0, 1, 2, 3].map((index) => termOf(fresh(), index));
    expect(labels).toEqual([
      { year: 2027, term: 1 },
      { year: 2027, term: 2 },
      { year: 2028, term: 1 },
      { year: 2028, term: 2 },
    ]);
  });

  test("starts in the second cuatrimestre when asked", () => {
    expect([0, 1].map((index) => termOf(fresh(2), index))).toEqual([
      { year: 2027, term: 2 },
      { year: 2028, term: 1 },
    ]);
  });
});

describe("a new plan", () => {
  test("has one empty cuatrimestre selected and nothing approved", () => {
    expect(fresh()).toMatchObject({ approved: [], terms: [[]], active: 0 });
  });

  test("enables only the first-cuatrimestre courses without correlatives", () => {
    expect(enabled(fresh(), 0).toSorted()).toEqual(["V1250", "V1280", "V1281", "V1282"]);
  });

  test("enables only what is offered when starting in the second cuatrimestre", () => {
    expect(enabled(fresh(2), 0)).toEqual(["L0002"]);
  });
});

describe("addCourse and removeCourse", () => {
  test("adds to the selected cuatrimestre", () => {
    const next = addCourse(fresh(), "V1281");
    expect(next.terms).toEqual([["V1281"]]);
    expect(locate(next, "V1281")).toBe(0);
  });

  test("adds to the approved bucket when it is selected", () => {
    const next = addCourse(goTo(fresh(), APPROVED_SLOT), "V1281");
    expect(next.approved).toEqual(["V1281"]);
    expect(locate(next, "V1281")).toBe(APPROVED_SLOT);
  });

  test("ignores a course that is already in the plan", () => {
    const once = addCourse(fresh(), "V1281");
    expect(addCourse(once, "V1281")).toEqual(once);
    expect(addCourse(stepSlot(once, 1), "V1281")).toEqual(stepSlot(once, 1));
  });

  test("removes a course wherever it is", () => {
    const next = removeCourse(addCourse(fresh(), "V1281"), "V1281");
    expect(next.terms).toEqual([[]]);
    expect(locate(next, "V1281")).toBeUndefined();
  });

  test("does not mutate the plan it receives", () => {
    const original = fresh();
    addCourse(original, "V1281");
    expect(original.terms).toEqual([[]]);
  });
});

describe("enabling across cuatrimestres", () => {
  const first = addCourse(fresh(), "V1281");

  test("a course taken this cuatrimestre does not unlock others in the same one", () => {
    expect(enabled(first, 0)).not.toContain("V1283");
  });

  test("unlocks it in the next cuatrimestre when it is offered there", () => {
    const next = stepSlot(first, 1);
    expect(next.active).toBe(1);
    expect(enabled(next, 1)).toContain("V1283");
  });

  test("approved courses unlock dependents from the first cuatrimestre", () => {
    const approved = addCourse(goTo(fresh(), APPROVED_SLOT), "V1250");
    expect(enabled(approved, 0)).not.toContain("V1251");
    expect(enabled(plan({ ...approved, terms: [[], []] }), 1)).toContain("V1251");
  });
});

describe("problemsFor", () => {
  test("reports the missing correlative", () => {
    expect(problemsFor(course("V1283"), plan({ terms: [[], []] }), 1, CURRICULUM)).toEqual([
      { kind: "regular", code: "V1281" },
    ]);
  });

  test("distinguishes a required approved final", () => {
    const p = plan({ terms: [["V1287", "V1251"], [], ["V1293"]] });
    expect(problemsFor(course("V1293"), p, 2, CURRICULUM)).toEqual([]);
    const regularOnly = plan({ terms: [["V1287"], [], ["V1293"]] });
    expect(problemsFor(course("V1293"), regularOnly, 2, CURRICULUM)).toEqual([
      { kind: "approved", code: "V1251" },
    ]);
  });

  test("reports a course placed in a cuatrimestre where it is not offered", () => {
    const p = plan({ terms: [["V1281"], []], approved: ["V1281"] });
    expect(problemsFor(course("V1283"), p, 0, CURRICULUM)).toContainEqual({
      kind: "term",
      offeredIn: [2],
    });
  });

  test("keeps the supervised practice for after fourth year", () => {
    expect(problemsFor(course("V1379"), fresh(), 0, CURRICULUM)).toContainEqual({
      kind: "year",
      year: 4,
    });
  });

  test("does not require a prerequisite order inside the approved bucket", () => {
    const p = plan({ approved: ["V1251", "V1250"] });
    expect(problemsFor(course("V1251"), p, APPROVED_SLOT, CURRICULUM)).toEqual([]);
  });
});

describe("planProblems", () => {
  test("is empty for a coherent plan", () => {
    const p = plan({
      terms: [
        ["V1281", "V1250"],
        ["V1283", "V1251"],
      ],
    });
    expect(planProblems(p, CURRICULUM)).toEqual([]);
  });

  test("flags courses that lose their prerequisite when it is removed", () => {
    const coherent = plan({ terms: [["V1281"], ["V1283"]] });
    const broken = removeCourse(coherent, "V1281");
    expect(planProblems(broken, CURRICULUM)).toEqual([
      { slot: 1, code: "V1283", problems: [{ kind: "regular", code: "V1281" }] },
    ]);
  });

  test("flags a course whose prerequisite is only planned later", () => {
    const p = plan({ terms: [["V1283"], ["V1281"]] });
    const flagged = planProblems(p, CURRICULUM).find((entry) => entry.code === "V1283");
    expect(flagged?.problems).toContainEqual({ kind: "regular", code: "V1281" });
  });
});

describe("navigation", () => {
  test("steps back to the approved bucket but not past it", () => {
    expect(stepSlot(fresh(), -1).active).toBe(APPROVED_SLOT);
    expect(stepSlot(stepSlot(fresh(), -1), -1).active).toBe(APPROVED_SLOT);
  });

  test("steps forward into a new cuatrimestre", () => {
    const filled = stepSlot(addCourse(fresh(), "V1281"), 1);
    expect(filled.terms).toEqual([["V1281"], []]);
    expect(filled.active).toBe(1);
  });

  test("lets a cuatrimestre stay empty and moves on to the next one", () => {
    const skipped = stepSlot(fresh(), 1);
    expect(skipped.terms).toEqual([[], []]);
    expect(skipped.active).toBe(1);
    expect(termOf(skipped, skipped.active)).toEqual({ year: 2027, term: 2 });
  });

  test("moves between existing cuatrimestres without creating more", () => {
    const filled = stepSlot(addCourse(fresh(), "V1281"), 1);
    const back = stepSlot(filled, -1);
    expect(back.active).toBe(0);
    expect(stepSlot(back, 1).terms).toHaveLength(2);
  });

  test("stepping back from an empty last cuatrimestre drops it", () => {
    const filled = stepSlot(addCourse(fresh(), "V1281"), 1);
    expect(stepSlot(filled, -1)).toMatchObject({ terms: [["V1281"]], active: 0 });
  });

  test("stepping back keeps a last cuatrimestre that has courses", () => {
    const p = plan({ terms: [["V1281"], ["V1283"]], active: 1 });
    expect(stepSlot(p, -1)).toMatchObject({ terms: [["V1281"], ["V1283"]], active: 0 });
  });

  test("stepping back keeps an empty cuatrimestre that is not the last", () => {
    const p = plan({ terms: [["V1281"], [], ["V1283"]], active: 1 });
    expect(stepSlot(p, -1)).toMatchObject({ terms: [["V1281"], [], ["V1283"]], active: 0 });
  });

  test("stepping back from the only cuatrimestre keeps it", () => {
    expect(stepSlot(fresh(), -1)).toMatchObject({ terms: [[]], active: APPROVED_SLOT });
  });

  test("removeTerm drops its courses and keeps at least one cuatrimestre", () => {
    const p = plan({ terms: [["V1281"], ["V1283"]], active: 1 });
    expect(removeTerm(p, 1)).toMatchObject({ terms: [["V1281"]], active: 0 });
    expect(removeTerm(plan({ terms: [["V1281"]], active: 0 }), 0)).toMatchObject({
      terms: [[]],
      active: 0,
    });
  });
});

describe("clearSlot", () => {
  const filled = plan({ approved: ["V1250"], terms: [["V1281"], ["V1283"]], active: 1 });

  test("empties only that cuatrimestre and keeps the slot", () => {
    expect(clearSlot(filled, 0)).toEqual({ ...filled, terms: [[], ["V1283"]] });
  });

  test("empties the approved bucket", () => {
    expect(clearSlot(filled, APPROVED_SLOT)).toEqual({ ...filled, approved: [] });
  });
});

describe("clearPlan", () => {
  const filled = plan({
    approved: ["V1250"],
    terms: [["V1281"], ["V1283"], []],
    active: 2,
    name: "Mi plan",
    startYear: 2028,
    startTerm: 2,
  });

  test("removes every course and goes back to a single empty cuatrimestre", () => {
    expect(clearPlan(filled)).toMatchObject({ approved: [], terms: [[]], active: 0 });
  });

  test("keeps the plan's identity and start", () => {
    expect(clearPlan(filled)).toMatchObject({
      id: filled.id,
      name: "Mi plan",
      startYear: 2028,
      startTerm: 2,
    });
  });

  test("does not mutate the plan it receives", () => {
    clearPlan(filled);
    expect(filled.terms).toEqual([["V1281"], ["V1283"], []]);
  });
});
