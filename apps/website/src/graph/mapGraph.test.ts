import { CURRICULUM, emptyPlan } from "planner";
import type { StudyPlan } from "planner";
import { expect, test } from "vite-plus/test";
import { buildMapGraph } from "./mapGraph.ts";

const blank = emptyPlan("p", "Mi plan", { year: 2027, term: 1 });
// V1281 is needed by V1283 (next cuatrimestre); V1282 by V1284, two cuatrimestres later.
const plan: StudyPlan = {
  ...blank,
  terms: [["V1281", "V1282"], ["V1283"], ["V1284"], []],
};
const count = (svg: string, needle: string) => svg.split(needle).length - 1;

test("is a self-contained SVG with one oval per planned course, inside the picture", () => {
  const { svg, cards, width, height } = buildMapGraph(plan, CURRICULUM);
  expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  expect(svg).toContain(`viewBox="0 0 ${width} ${height}"`);
  expect(count(svg, "<ellipse")).toBe(4);
  expect(cards.map((card) => card.code).toSorted()).toEqual(["V1281", "V1282", "V1283", "V1284"]);
  for (const card of cards) {
    expect(card.x + card.width).toBeLessThanOrEqual(width);
    expect(card.y + card.height).toBeLessThanOrEqual(height);
  }
});

test("groups the cuatrimestres of each year in one box, later years to the right", () => {
  const { svg, cards } = buildMapGraph(plan, CURRICULUM);
  // 2027 and 2028: one box each.
  expect(count(svg, 'class="year ')).toBe(2);
  expect(svg).toContain(">2027<");
  expect(svg).toContain(">2028<");
  const x = (code: string) => cards.find((card) => card.code === code)!.x;
  expect(x("V1283")).toBeGreaterThan(x("V1281"));
  expect(x("V1284")).toBeGreaterThan(x("V1283"));
  expect(x("V1282")).toBe(x("V1281"));
});

test("draws every correlative straight from course to course, coloured by the course it leaves", () => {
  const { svg } = buildMapGraph(plan, CURRICULUM);
  expect(svg).toContain('data-from="V1281" data-to="V1283"');
  // Two cuatrimestres apart, still a single direct arrow.
  expect(svg).toContain('data-from="V1282" data-to="V1284"');
  const stroke = (from: string) =>
    new RegExp(`data-from="${from}"[^>]*stroke="(#[0-9a-f]{6})"`).exec(svg)![1];
  expect(stroke("V1281")).not.toBe(stroke("V1282"));
});

test("lists each code with its name below the map", () => {
  const { svg } = buildMapGraph(plan, CURRICULUM);
  expect(svg).toContain("Matemática I");
  expect(svg).toContain("Organización y Arquitectura de Computadoras");
});

test("a focused course keeps its arrows and fades the rest", () => {
  const { svg } = buildMapGraph(plan, CURRICULUM, { focus: "V1281" });
  expect(svg).toMatch(/data-code="V1282"[^>]*opacity="0.3"/);
  expect(svg).not.toMatch(/data-code="V1283"[^>]*opacity="0.3"/);
});

test("no arrow ever crosses an oval, even when it skips several cuatrimestres", () => {
  // The whole curriculum, each course in the cuatrimestre it is given in.
  const full: StudyPlan = { ...blank, terms: Array.from({ length: 10 }, () => []) };
  for (const course of CURRICULUM) {
    full.terms[(course.year - 1) * 2 + (course.terms[0]! - 1)]!.push(course.code);
  }
  const { svg } = buildMapGraph(full, CURRICULUM);
  const ovals = [
    ...svg.matchAll(/<ellipse cx="([\d.]+)" cy="([\d.]+)" rx="([\d.]+)" ry="([\d.]+)"/g),
  ].map((match) => match.slice(1).map(Number) as [number, number, number, number]);
  const paths = [...svg.matchAll(/data-from="[^"]+" data-to="[^"]+" d="([^"]+)"/g)].map((match) =>
    match[1]!.match(/-?[\d.]+/g)!.map(Number),
  );
  expect(paths.length).toBeGreaterThan(30);
  for (const numbers of paths) {
    let [x0, y0] = numbers as [number, number];
    for (let i = 2; i + 5 < numbers.length + 1; i += 6) {
      const [x1, y1, x2, y2, x3, y3] = numbers.slice(i, i + 6) as number[];
      for (let step = 1; step < 20; step++) {
        const t = step / 20;
        const u = 1 - t;
        const x = u ** 3 * x0 + 3 * u * u * t * x1! + 3 * u * t * t * x2! + t ** 3 * x3!;
        const y = u ** 3 * y0 + 3 * u * u * t * y1! + 3 * u * t * t * y2! + t ** 3 * y3!;
        for (const [cx, cy, rx, ry] of ovals) {
          expect(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2).toBeGreaterThan(0.98);
        }
      }
      [x0, y0] = [x3!, y3!];
    }
  }
});

test("about one cuatrimestre: its courses, the ones they need and the ones planned after that need them", () => {
  // V1281 → V1283 (next) and V1285 (later); V1282 → V1284. About the second cuatrimestre.
  const term: StudyPlan = {
    ...blank,
    terms: [["V1281", "V1282"], ["V1283"], ["V1285", "V1288"], ["V1284"]],
  };
  const { svg, cards } = buildMapGraph(term, CURRICULUM, { about: new Set(["V1283"]) });
  // V1283 needs V1281 and enables V1288 (Introducción a los Sistemas Operativos).
  expect(cards.map((card) => card.code).toSorted()).toEqual(["V1281", "V1283", "V1288"]);
  expect(svg).toContain('data-from="V1281" data-to="V1283"');
  expect(svg).toContain('data-from="V1283" data-to="V1288"');
  // An arrow between two courses the drawing is not about is left out.
  expect(svg).not.toContain('data-to="V1285"');
});

test("a course that nothing planned later needs gets no arrow out", () => {
  const term: StudyPlan = { ...blank, terms: [["V1281"], ["V1283"]] };
  const { svg } = buildMapGraph(term, CURRICULUM, { about: new Set(["V1283"]) });
  expect(svg).not.toContain('data-from="V1283"');
});

test("draws only some courses, outlines the root, builds up when animated, and tells each oval's colour", () => {
  const { svg, cards } = buildMapGraph(plan, CURRICULUM, {
    only: new Set(["V1281", "V1283"]),
    root: "V1281",
    animate: true,
  });
  expect(cards.map((card) => card.code).toSorted()).toEqual(["V1281", "V1283"]);
  expect(svg).toContain("@keyframes");
  expect(svg).toMatch(/class="card root"/);
  expect(cards.find((card) => card.code === "V1281")!.colour).toMatch(/^#[0-9a-f]{6}$/);
});
