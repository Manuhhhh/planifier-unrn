import { expect, test } from "vite-plus/test";
import { splitCrowded } from "./crowding.ts";
import type { Routed } from "./crowding.ts";

const arrow = (from: string, to: string, columns: [number, number], side: "up" | "down" = "up") =>
  ({ from, to, arc: { from: columns[0], to: columns[1], side } }) satisfies Routed;

test("arrows that fit together share one board", () => {
  const items = [arrow("A", "B", [0, 2]), arrow("C", "D", [3, 5])];
  expect(splitCrowded(items, { lanes: 3, ends: 3 })).toEqual([0, 0]);
});

test("a board never stacks more lanes than the limit on one side", () => {
  const items = [arrow("A1", "B1", [0, 2]), arrow("A2", "B2", [0, 3]), arrow("A3", "B3", [0, 4])];
  const groups = splitCrowded(items, { lanes: 2, ends: 9 });
  expect(new Set(groups).size).toBe(2);
});

test("lanes on the other side do not count against this one", () => {
  const items = [arrow("A1", "B1", [0, 2], "up"), arrow("A2", "B2", [0, 3], "down")];
  expect(splitCrowded(items, { lanes: 1, ends: 9 })).toEqual([0, 0]);
});

test("a board never brings more arrows than the limit to one card", () => {
  const items = [arrow("A", "T", [0, 4]), arrow("B", "T", [1, 4], "down"), arrow("C", "T", [2, 4])];
  const groups = splitCrowded(items, { lanes: 9, ends: 2 });
  const atT = (group: number) => groups.filter((entry) => entry === group).length;
  expect(Math.max(...groups.map(atT))).toBeLessThanOrEqual(2);
  expect(new Set(groups).size).toBe(2);
});

test("no arrows, no boards", () => {
  expect(splitCrowded([], { lanes: 3, ends: 3 })).toEqual([]);
});
