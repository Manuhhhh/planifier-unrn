import { CURRICULUM, emptyPlan } from "planner";
import type { StudyPlan } from "planner";
import { expect, test } from "vite-plus/test";
import { buildPlanGraph } from "./planGraph.ts";
import { buildVerticalGraph } from "./verticalGraph.ts";

const blank = emptyPlan("p", "Mi plan", { year: 2027, term: 1 });
// V1281 is needed by V1283 (next cuatrimestre); V1282 by V1284, two cuatrimestres later.
const plan: StudyPlan = {
  ...blank,
  terms: [["V1281", "V1282"], ["V1283"], ["V1284"], []],
};
const count = (svg: string, needle: string) => svg.split(needle).length - 1;

test("is a self-contained SVG as narrow as a phone, however many cuatrimestres there are", () => {
  const { svg, width, height } = buildVerticalGraph(plan, CURRICULUM);
  expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  expect(svg).toContain(`viewBox="0 0 ${width} ${height}"`);
  expect(width).toBeLessThanOrEqual(420);
  expect(width).toBeLessThan(buildPlanGraph(plan, CURRICULUM).width);
});

test("stacks the cuatrimestres top to bottom, each course in its own place inside the picture", () => {
  const { cards, width, height } = buildVerticalGraph(plan, CURRICULUM);
  const byCode = new Map(cards.map((card) => [card.code, card]));
  expect([...byCode.keys()].toSorted()).toEqual(["V1281", "V1282", "V1283", "V1284"]);
  // Later cuatrimestres are lower down.
  expect(byCode.get("V1283")!.y).toBeGreaterThan(byCode.get("V1281")!.y);
  expect(byCode.get("V1284")!.y).toBeGreaterThan(byCode.get("V1283")!.y);
  // The courses of one cuatrimestre are one under the other, not side by side.
  expect(byCode.get("V1282")!.y).toBeGreaterThan(byCode.get("V1281")!.y);
  expect(byCode.get("V1282")!.x).toBe(byCode.get("V1281")!.x);
  for (const card of cards) {
    expect(card.x).toBeGreaterThanOrEqual(0);
    expect(card.x + card.width).toBeLessThanOrEqual(width);
    expect(card.y + card.height).toBeLessThanOrEqual(height);
  }
});

test("draws an arrow for every correlative between planned courses, ends tagged", () => {
  const { svg } = buildVerticalGraph(plan, CURRICULUM);
  expect(svg).toContain('data-from="V1281" data-to="V1283"');
  expect(svg).toContain('data-from="V1282" data-to="V1284"');
  expect(count(svg, '<path class="edge-')).toBe(count(svg, "data-from="));
});

test("arrows run in the margins, never over a card", () => {
  const { svg, cards } = buildVerticalGraph(plan, CURRICULUM);
  const paths = [...svg.matchAll(/<path class="edge-[^"]*"[^>]* d="([^"]+)"/g)].map((m) => m[1]!);
  expect(paths.length).toBeGreaterThan(0);
  for (const d of paths) {
    // The long vertical run sits at the x of the first curve's control point.
    const lane = Number(d.match(/Q([\d.]+) /)![1]);
    expect(cards.some((card) => lane > card.x && lane < card.x + card.width)).toBe(false);
  }
});

test("a course that breaks a rule gets the amber warning, and a focus fades the rest", () => {
  const broken: StudyPlan = { ...blank, terms: [["V1283"], ["V1281"]] };
  expect(buildVerticalGraph(broken, CURRICULUM).svg).toContain("!");
  const { svg } = buildVerticalGraph(plan, CURRICULUM, { focus: "V1283" });
  expect(svg).toContain('class="card focused"');
  expect(svg).toContain('opacity="0.3"');
  expect(svg).toMatch(/class="edge-regular focused"[^>]*stroke-width="2.25"/);
});

test("the root is outlined with its halo and `only` leaves the others out", () => {
  const { svg, cards } = buildVerticalGraph(plan, CURRICULUM, {
    only: new Set(["V1281", "V1283"]),
    root: "V1283",
    title: "Matemática I",
  });
  expect(cards.map((card) => card.code).toSorted()).toEqual(["V1281", "V1283"]);
  expect(svg).toContain('class="card root"');
  expect(svg).toContain('fill="#b91c1c" opacity="0.22"');
  expect(svg).not.toContain('opacity="0.3"');
});

test("builds up when animated, and is still otherwise; dark has its own colours", () => {
  expect(buildVerticalGraph(plan, CURRICULUM).svg).not.toContain("@keyframes");
  expect(buildVerticalGraph(plan, CURRICULUM, { animate: true }).svg).toContain("@keyframes");
  expect(buildVerticalGraph(plan, CURRICULUM, { theme: "dark" }).svg).toContain("#2e2926");
});

test("escapes the plan name", () => {
  const { svg } = buildVerticalGraph({ ...plan, name: '<b>"x" & y</b>' }, CURRICULUM);
  expect(svg).not.toContain("<b>");
  expect(svg).toContain("&lt;b&gt;");
});
