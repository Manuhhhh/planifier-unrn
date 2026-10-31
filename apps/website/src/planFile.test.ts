import { emptyPlan } from "planner";
import type { Course, StudyPlan } from "planner";
import { expect, test } from "vite-plus/test";
import { parsePlanFile, planFileName, serializePlan } from "./planFile.ts";

const course = (code: string): Course =>
  ({ code, name: code, year: 1, terms: [1, 2], hours: 96 }) as unknown as Course;
const curriculum = [course("A"), course("B"), course("C")];

const plan: StudyPlan = {
  ...emptyPlan("original-id", "Mi plan", { year: 2026, term: 2 }),
  approved: ["A"],
  terms: [["B"], ["C"]],
  active: 1,
};

test("a plan survives export and import with a fresh id", () => {
  const result = parsePlanFile(serializePlan(plan), curriculum);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.plan).toEqual({ ...plan, id: result.plan.id });
  expect(result.plan.id).not.toBe(plan.id);
  expect(result.dropped).toBe(0);
});

test("the exported document does not carry the plan id", () => {
  expect(serializePlan(plan)).not.toContain("original-id");
});

test("courses missing from the curriculum are dropped and counted", () => {
  const text = serializePlan({ ...plan, terms: [["B", "ZZZ"], ["C"]] });
  const result = parsePlanFile(text, curriculum);
  expect(result.ok && result.plan.terms).toEqual([["B"], ["C"]]);
  expect(result.ok && result.dropped).toBe(1);
});

test("rejects text that is not an exported plan", () => {
  for (const text of ["not json", "null", "[]", '{"app":"other","version":1,"plan":{}}']) {
    expect(parsePlanFile(text, curriculum)).toEqual({
      ok: false,
      error: "El archivo no es un plan exportado válido.",
    });
  }
});

test("rejects a plan without a start", () => {
  const text = JSON.stringify({ app: "planifier-unrn", version: 1, plan: { name: "x" } });
  expect(parsePlanFile(text, curriculum).ok).toBe(false);
});

test("rejects an unknown version", () => {
  const text = serializePlan(plan).replace('"version": 1', '"version": 2');
  expect(parsePlanFile(text, curriculum)).toMatchObject({ ok: false });
});

test("file names are safe slugs of the plan name", () => {
  expect(planFileName({ ...plan, name: "Mi Plan ñandú / 2026!" })).toBe(
    "mi-plan-nandu-2026.planificador.json",
  );
  expect(planFileName({ ...plan, name: "¡¡" })).toBe("plan.planificador.json");
});

test("failed courses survive export and import", () => {
  const failing = { ...plan, failed: ["B"] };
  const result = parsePlanFile(serializePlan(failing), curriculum);
  expect(result.ok && result.plan.failed).toEqual(["B"]);
});

test("a file without failed courses reads as it always did, with no failed field", () => {
  expect(serializePlan(plan)).not.toContain("failed");
  const result = parsePlanFile(serializePlan(plan), curriculum);
  expect(result.ok && "failed" in result.plan).toBe(false);
});

test("a failed mark needs a planned course", () => {
  const text = serializePlan({ ...plan, failed: ["B", "A", "ZZZ", "B"] });
  const result = parsePlanFile(text, curriculum);
  expect(result.ok && result.plan.failed).toEqual(["B"]);
});
