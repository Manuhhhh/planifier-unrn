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
  expect(page.match(/<\/script>/g)).toHaveLength(4);
  expect(() => lineages(page)).not.toThrow();
});

test("starts on the layout the app was showing", () => {
  expect(buildInteractiveHtml(withCourses, CURRICULUM, "single")).toContain(
    '<body data-rows="single">',
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
