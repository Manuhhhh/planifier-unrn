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

const lineages = (page: string) =>
  JSON.parse(
    page.match(/<script type="application\/json" id="lineages">([\s\S]*?)<\/script>/)![1]!,
  );

test("carries the chain of every planned course, with its cards and both drawings", () => {
  const chains = lineages(html()).split;
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
  expect(page.match(/<\/script>/g)).toHaveLength(3);
  expect(() => lineages(page)).not.toThrow();
});

test("starts on the layout the app was showing", () => {
  expect(buildInteractiveHtml(withCourses, CURRICULUM, "single")).toContain(
    '<body data-rows="single">',
  );
});

test("stores a chain once when both layouts draw it the same", () => {
  const { split, single } = lineages(html());
  expect(Object.keys(split).length).toBeGreaterThan(0);
  expect(Object.keys(single).every((code) => split[code].light !== single[code].light)).toBe(true);
});
