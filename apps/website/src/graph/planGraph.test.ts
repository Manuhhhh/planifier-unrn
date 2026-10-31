import { CURRICULUM, emptyPlan } from "planner";
import type { Course, StudyPlan } from "planner";
import { expect, test } from "vite-plus/test";
import { buildPlanGraph, neighboursOf, wrapName } from "./planGraph.ts";

const start = { year: 2027, term: 1 as const };
const blank = emptyPlan("p", "Mi plan", start);
const count = (svg: string, needle: string) => svg.split(needle).length - 1;

const withFinal = CURRICULUM.find((course) => course.correlatives.enrollApproved.length > 0)!;
const withCursada = CURRICULUM.find(
  (course) =>
    course.correlatives.enrollRegular.length > 0 && course.correlatives.enrollApproved.length === 0,
)!;

/** Needs placed in the approved bucket, the course itself in the first cuatrimestre. */
const planFor = (course: Course, needs: readonly string[]): StudyPlan => ({
  ...blank,
  approved: [...needs],
  terms: [[course.code]],
});

test("is a self-contained SVG sized to its content", () => {
  const { svg, width, height } = buildPlanGraph(blank, CURRICULUM);
  expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  expect(svg).toContain(`viewBox="0 0 ${width} ${height}"`);
});

test("escapes the plan name", () => {
  const { svg } = buildPlanGraph({ ...blank, name: '<b>"x" & y</b>' }, CURRICULUM);
  expect(svg).not.toContain("<b>");
  expect(svg).toContain("&lt;b&gt;&quot;x&quot; &amp; y&lt;/b&gt;");
});

test("a plan without correlatives between its courses has no arrows and no key", () => {
  const { svg } = buildPlanGraph(blank, CURRICULUM);
  expect(svg).not.toContain('class="edge-');
  expect(svg).not.toContain("Referencias");
});

test("draws a solid arrow for a needed cursada and explains it", () => {
  const needs = withCursada.correlatives.enrollRegular;
  const { svg } = buildPlanGraph(planFor(withCursada, needs), CURRICULUM);
  expect(count(svg, 'class="edge-regular"')).toBe(needs.length);
  expect(svg).not.toContain('class="edge-approved"');
  expect(svg).toContain("Requiere la cursada aprobada");
  expect(svg).not.toContain("Requiere el final aprobado");
});

test("draws a dashed arrow for a needed final and explains it", () => {
  const needs = withFinal.correlatives.enrollApproved;
  const { svg } = buildPlanGraph(planFor(withFinal, needs), CURRICULUM);
  const dashed = svg.split("<path").filter((part) => part.includes('class="edge-approved"'));
  expect(dashed).toHaveLength(needs.length);
  expect(dashed.every((part) => part.includes("stroke-dasharray"))).toBe(true);
  expect(svg).toContain("Requiere el final aprobado");
});

test("no arrow when the needed course comes later; the course is flagged instead", () => {
  const needs = withCursada.correlatives.enrollRegular;
  const plan: StudyPlan = { ...blank, terms: [[withCursada.code], [...needs]] };
  const { svg } = buildPlanGraph(plan, CURRICULUM);
  expect(svg).not.toContain('class="edge-');
  expect(svg).toContain("No cumple correlatividades");
});

test("wraps long names onto two lines at most", () => {
  expect(wrapName("Matemática")).toEqual(["Matemática"]);
  const lines = wrapName(
    "Introducción a la programación orientada a objetos y sistemas distribuidos",
  );
  expect(lines).toHaveLength(2);
  expect(lines[1]!.endsWith("…")).toBe(true);
});

test("an arrow between neighbouring columns is direct; one that skips a cuatrimestre runs outside", () => {
  const needs = withCursada.correlatives.enrollRegular;
  const neighbour = buildPlanGraph(planFor(withCursada, needs), CURRICULUM).svg;
  const skipping = buildPlanGraph(
    { ...blank, approved: [...needs], terms: [[], [withCursada.code]] },
    CURRICULUM,
  ).svg;
  const pathsOf = (svg: string) =>
    svg.split("<path").filter((part) => part.includes('class="edge-'));
  // Only the routes that go around the board have a straight run along their lane (L).
  expect(pathsOf(neighbour).every((part) => !part.includes(" L"))).toBe(true);
  expect(pathsOf(skipping).every((part) => part.includes(" L"))).toBe(true);
  expect(skipping).toContain("Rodea el tablero");
  expect(neighbour).not.toContain("Rodea el tablero");
});

/** A → B → C over three cuatrimestres, where C also needs A directly. */
const chain = (() => {
  for (const c of CURRICULUM) {
    for (const b of c.correlatives.enrollRegular) {
      const course = CURRICULUM.find((entry) => entry.code === b)!;
      const a = course.correlatives.enrollRegular.find((code) =>
        c.correlatives.enrollRegular.includes(code),
      );
      if (a) return { a, b, c: c.code };
    }
  }
  throw new Error("the curriculum has no implied correlative");
})();

test("neighbouring arrows go on the first board, skipping ones on a second board below", () => {
  const needs = withCursada.correlatives.enrollRegular;
  const { svg } = buildPlanGraph(
    { ...blank, approved: [...needs], terms: [[], [withCursada.code]] },
    CURRICULUM,
  );
  expect(svg).toContain("Cuatrimestre a cuatrimestre");
  expect(svg).toContain("Correlativas a distancia");
  const single = buildPlanGraph(planFor(withCursada, needs), CURRICULUM).svg;
  expect(single).toContain("Cuatrimestre a cuatrimestre");
  expect(single).not.toContain("Correlativas a distancia");
});

test("crowded distant arrows spread over more boards, each one numbered", () => {
  const full: StudyPlan = {
    ...blank,
    terms: [
      ["V1250", "V1280", "V1282", "V1281"],
      ["V1251", "V1284", "V1285", "V1283"],
      ["V1286", "V1287", "V1289", "V1288"],
      ["V1290", "V1291", "L0002", "V1292"],
      ["V1293", "V1294", "V1295", "L0003"],
      ["V1296", "V1223", "V1297", "V1298"],
      ["V1299", "V1374", "V1371"],
      ["V1372", "V1373", "V1370", "V1249"],
      ["V1378", "V1377", "V1235", "V1379"],
      ["V1375", "V1376", "V1248"],
    ],
  };
  const { svg, cards } = buildPlanGraph(full, CURRICULUM);
  const boards = count(svg, "Correlativas a distancia");
  expect(boards).toBeGreaterThan(1);
  expect(svg).toContain(`Correlativas a distancia (${boards} de ${boards})`);
  // The first board has every card; the distant ones only the cards their arrows join.
  expect(cards.length).toBeGreaterThan(38);
  expect(cards.length).toBeLessThan(38 * (boards + 1));
});

test("a distant board leaves out the courses with no arrow on it", () => {
  const needs = withCursada.correlatives.enrollRegular;
  const loose = CURRICULUM.find(
    (course) =>
      course.code !== withCursada.code &&
      !needs.includes(course.code) &&
      !withCursada.correlatives.enrollApproved.includes(course.code),
  )!;
  const { cards } = buildPlanGraph(
    { ...blank, approved: [...needs], terms: [[loose.code], [withCursada.code]] },
    CURRICULUM,
  );
  const codes = cards.map((card) => card.code);
  expect(codes.filter((code) => code === loose.code)).toHaveLength(1);
  expect(codes.filter((code) => code === withCursada.code)).toHaveLength(2);
});

test("an arrow implied by a chain is left out, and the key says so", () => {
  const plan: StudyPlan = { ...blank, terms: [[chain.a], [chain.b], [chain.c]] };
  const { svg } = buildPlanGraph(plan, CURRICULUM);
  const arrows = count(svg, 'class="edge-');
  expect(svg).toContain("Se omiten las correlativas implícitas en otra cadena");
  // A → C is implied by A → B → C, so only the two neighbouring arrows remain.
  expect(arrows).toBe(2);
  expect(svg).not.toContain("Correlativas a distancia");
});

test("focusing a course also shows the implied arrows it takes part in", () => {
  const plan: StudyPlan = { ...blank, terms: [[chain.a], [chain.b], [chain.c]] };
  const plain = buildPlanGraph(plan, CURRICULUM);
  const focused = buildPlanGraph(plan, CURRICULUM, { focus: chain.c });
  expect(count(focused.svg, 'class="edge-regular focused"')).toBe(2);
  // Hover targets must not move when the focus changes.
  expect(focused.cards).toEqual(plain.cards);
  expect([focused.width, focused.height]).toEqual([plain.width, plain.height]);
});

test("the neighbours of a course are the ones one step away, before and after it", () => {
  const plan: StudyPlan = { ...blank, terms: [[chain.a], [chain.b], [chain.c]] };
  expect(neighboursOf(plan, CURRICULUM, chain.b)).toEqual({
    needs: new Set([chain.a]),
    unlocks: new Set([chain.c]),
  });
});

test("a correlative also reached through another one is two steps away, so it is left out", () => {
  // C needs A directly, but also needs B, which needs A: A is two steps from C.
  const plan: StudyPlan = { ...blank, terms: [[chain.a], [chain.b], [chain.c]] };
  expect(neighboursOf(plan, CURRICULUM, chain.c).needs).toEqual(new Set([chain.b]));
  expect(neighboursOf(plan, CURRICULUM, chain.a).unlocks).toEqual(new Set([chain.b]));
});

test("on a single row every arrow shares one board, the distant ones around it", () => {
  const needs = withCursada.correlatives.enrollRegular;
  const plan: StudyPlan = { ...blank, approved: [...needs], terms: [[], [withCursada.code]] };
  const { svg, cards } = buildPlanGraph(plan, CURRICULUM, { rows: "single" });
  expect(svg).not.toContain("Correlativas a distancia");
  expect(svg).toContain("Todas las correlativas");
  expect(svg).toContain("Rodea el tablero");
  expect(cards).toHaveLength(needs.length + 1);
  const routes = svg.split("<path").filter((part) => part.includes('class="edge-'));
  expect(routes).toHaveLength(needs.length);
  expect(routes.every((part) => part.includes(" L"))).toBe(true);
});

test("drawing only some courses leaves out the rest and the columns left empty", () => {
  const needs = withCursada.correlatives.enrollRegular;
  const other = CURRICULUM.find(
    (course) => course.code !== withCursada.code && !needs.includes(course.code),
  )!;
  const plan: StudyPlan = {
    ...blank,
    approved: [...needs],
    terms: [[withCursada.code], [other.code], []],
  };
  const { svg, cards } = buildPlanGraph(plan, CURRICULUM, {
    only: new Set([withCursada.code, ...needs]),
    root: withCursada.code,
    title: withCursada.name,
  });
  expect(cards.map((card) => card.code).toSorted()).toEqual(
    [withCursada.code, ...needs].toSorted(),
  );
  expect(svg).not.toContain("Vacío");
  expect(svg).toContain(`>${withCursada.name}</text>`);
  // The root stands out without fading anything else.
  expect(svg).toContain('class="card root"');
  // ...and carries a halo and an accent border, which no other card has.
  expect(svg).toContain('stroke="#b91c1c" stroke-width="2.5"');
  expect(svg).toContain('fill="#b91c1c" opacity="0.22"');
  expect(svg).not.toContain('opacity="0.3"');
});

test("an animated drawing builds up; a still one has no animation at all", () => {
  const needs = withCursada.correlatives.enrollRegular;
  const plan = planFor(withCursada, needs);
  const still = buildPlanGraph(plan, CURRICULUM).svg;
  const moving = buildPlanGraph(plan, CURRICULUM, { animate: true }).svg;
  expect(still).not.toContain("@keyframes");
  expect(moving).toContain("@keyframes");
  expect(moving).toContain("prefers-reduced-motion");
  expect(moving).toContain("animation-delay");
});

test("a dark drawing swaps every light colour for a dark one", () => {
  const needs = withCursada.correlatives.enrollRegular;
  const plan = planFor(withCursada, needs);
  const light = buildPlanGraph(plan, CURRICULUM).svg;
  const dark = buildPlanGraph(plan, CURRICULUM, { theme: "dark" }).svg;
  expect(light).toContain('fill="#ffffff"');
  expect(dark).not.toContain('fill="#ffffff"');
  // No text keeps the light theme's ink, which would vanish on the dark page.
  expect(dark).not.toContain('fill="#1c1917" font-family');
  expect(dark).toContain('fill="#f5f5f4"');
  // Same layout either way: only the colours change.
  const sizes = (svg: string) => svg.match(/viewBox="[^"]+"/)![0];
  expect(sizes(dark)).toBe(sizes(light));
});

test("lists the areas of the courses in the plan, and only those", () => {
  const { svg } = buildPlanGraph({ ...blank, terms: [["V1281", "V1250"]] }, CURRICULUM);
  expect(svg).toContain("Matemática</text>");
  expect(svg).toContain("Programación</text>");
  expect(svg).not.toContain("Bases de datos</text>");
});

test("exposes where each card is, for hover targets", () => {
  const { cards, width, height } = buildPlanGraph(
    { ...blank, terms: [["V1281", "V1250"]] },
    CURRICULUM,
  );
  expect(cards.map((card) => card.code).toSorted()).toEqual(["V1250", "V1281"]);
  for (const card of cards) {
    expect(card.x + card.width).toBeLessThanOrEqual(width);
    expect(card.y + card.height).toBeLessThanOrEqual(height);
  }
});

test("focusing a course dims what is unrelated and strengthens its arrows", () => {
  const needs = withCursada.correlatives.enrollRegular;
  const unrelated = CURRICULUM.find(
    (course) =>
      course.code !== withCursada.code &&
      !needs.includes(course.code) &&
      course.correlatives.enrollRegular.length === 0 &&
      course.correlatives.enrollApproved.length === 0,
  )!;
  const plan: StudyPlan = {
    ...blank,
    approved: [...needs],
    terms: [[withCursada.code, unrelated.code]],
  };
  const plain = buildPlanGraph(plan, CURRICULUM).svg;
  const focused = buildPlanGraph(plan, CURRICULUM, { focus: withCursada.code }).svg;
  expect(plain).not.toContain('opacity="0.3"');
  expect(count(focused, 'class="card dimmed"')).toBe(1);
  expect(count(focused, 'class="edge-regular focused"')).toBe(needs.length);
});

test("keeps whole-pixel dimensions however the cards slide", () => {
  const needs = withCursada.correlatives.enrollRegular;
  const { width, height } = buildPlanGraph(planFor(withCursada, needs), CURRICULUM);
  expect(Number.isInteger(width)).toBe(true);
  expect(Number.isInteger(height)).toBe(true);
});
