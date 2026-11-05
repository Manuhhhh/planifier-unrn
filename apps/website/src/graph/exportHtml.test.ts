import { CURRICULUM, emptyPlan } from "planner";
import { expect, test } from "vite-plus/test";
import { buildInteractiveHtml } from "./exportHtml.ts";

const withCourses = {
  ...emptyPlan("p", "Mi plan", { year: 2027, term: 1 }),
  approved: ["V1281"],
  terms: [["V1283"]],
};
const html = (plan = withCourses) => buildInteractiveHtml(plan, CURRICULUM, "split");

test("is one page with the drawing in both themes and a theme switch", () => {
  const page = html();
  expect(page.startsWith("<!doctype html>")).toBe(true);
  for (const rows of ["split", "single"]) {
    for (const theme of ["light", "dark"])
      expect(page).toContain(`<template id="svg-${rows}-${theme}">`);
  }
  expect(page).toContain('data-rows="split"');
  expect(page).toContain('data-rows="single"');
  expect(page).toContain('id="theme"');
});

test("loads nothing from outside", () => {
  expect(html()).not.toMatch(/(src|href)="https?:/);
});

test("tags every course card and arrow so the page can bring one forward", () => {
  const page = html();
  expect(page).toContain('data-code="V1283"');
  expect(page).toContain('data-from="V1281" data-to="V1283"');
});

test("escapes the plan name everywhere it is shown", () => {
  const page = html({ ...withCourses, name: '</title><script>alert(1)</script>"' });
  expect(page).not.toContain("<script>alert(1)");
  expect(page).toContain("&lt;/title&gt;&lt;script&gt;alert(1)");
});

const lineages = (page: string, id = "lineages") =>
  JSON.parse(
    page.match(new RegExp(`<script type="application/json" id="${id}">([\\s\\S]*?)</script>`))![1]!,
  );

test("carries the chain of every planned course, with its cards and both drawings", () => {
  const chains = lineages(html());
  expect(Object.keys(chains).sort()).toEqual(["V1281", "V1283"]);
  const chain = chains.V1283;
  expect(chain).toMatchObject({ needs: 1, unlocks: 0 });
  expect(chain.cards.map((card: { code: string }) => card.code).sort()).toEqual(["V1281", "V1283"]);
  expect(chain.light).toContain("<svg");
  expect(chain.dark).toContain("<svg");
  expect(chain.light).not.toBe(chain.dark);
});

test("keeps the chain data from closing its script element", () => {
  const page = html({ ...withCourses, name: "</script><!--" });
  // Theme picker, three chain lists (wide, stacked, map) and the page script.
  expect(page.match(/<\/script>/g)).toHaveLength(5);
  expect(() => lineages(page)).not.toThrow();
});

test("starts on the layout the app was showing", () => {
  expect(buildInteractiveHtml(withCourses, CURRICULUM, "single")).toContain(
    '<body data-rows="single" data-style="cards">',
  );
});

test("draws every chain on one board, whichever layout the page starts on", () => {
  const chains = lineages(html());
  expect(lineages(buildInteractiveHtml(withCourses, CURRICULUM, "single"))).toEqual(chains);
  expect(chains.V1283.height).toBeLessThan(500);
});

test("carries the stacked drawing for phones: every course's chain and the whole plan", () => {
  const page = html();
  expect(page).toContain('<template id="svg-tall-light">');
  expect(page).toContain('<template id="svg-tall-dark">');
  const tall = lineages(page, "lineages-tall");
  expect(Object.keys(tall).sort()).toEqual(["V1281", "V1283"]);
  // Stacked, so narrower than the wide chain of the same course.
  expect(tall.V1283.width).toBeLessThan(lineages(page).V1283.width);
  expect(tall.V1283.cards).toHaveLength(2);
});

test("picks the stacked drawing on a narrow screen, and hides the rows switch there", () => {
  const page = html();
  expect(page).toContain('matchMedia("(max-width: 767px)")');
  expect(page).toContain("@media (max-width:767px){.rows{display:none}");
  expect(page).toContain("@media (min-width:768px){#board{min-width:");
});

test("a touch screen does not fade the other cards on tap", () => {
  const page = html();
  expect(page).toContain('matchMedia("(pointer: coarse)")');
  expect(page).toContain("card && !touch.matches ? card.dataset.code : null");
});

test("carries the map drawing in both themes, with a switch between cards and map", () => {
  const page = html();
  expect(page).toContain('<template id="svg-map-light">');
  expect(page).toContain('<template id="svg-map-dark">');
  expect(page).toContain("<ellipse");
  expect(page).toContain('data-style="cards"');
  expect(page).toContain('data-style="map"');
});

test("starts on the style the app was showing", () => {
  expect(buildInteractiveHtml(withCourses, CURRICULUM, "split", "map")).toContain(
    '<body data-rows="split" data-style="map">',
  );
  expect(html()).toContain('data-style="cards">');
});

test("carries the map chain of every planned course, flying as ovals with their colour", () => {
  const page = html();
  const chains = lineages(page, "lineages-map") as Record<
    string,
    { oval: boolean; light: string; cards: { code: string; color: string }[] }
  >;
  expect(Object.keys(chains).toSorted()).toEqual(["V1281", "V1283"]);
  expect(chains.V1283!.oval).toBe(true);
  expect(chains.V1283!.light).toContain("<ellipse");
  expect(chains.V1283!.cards.map((card) => card.code).toSorted()).toEqual(["V1281", "V1283"]);
  for (const card of chains.V1283!.cards) expect(card.color).toMatch(/^#[0-9a-f]{6}$/);
});
