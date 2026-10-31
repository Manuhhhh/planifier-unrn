import { expect, test } from "vite-plus/test";
import { placeVertically } from "./place.ts";

const STEP = 70;

test("a course slides level with the one it is joined to", () => {
  const top = placeVertically([["a", "b"], ["c"]], [{ from: "b", to: "c" }], STEP);
  expect(top.get("c")).toBe(top.get("b"));
});

test("cards keep their order and stay a step apart", () => {
  const top = placeVertically(
    [["a"], ["b", "c"]],
    [
      { from: "a", to: "b" },
      { from: "a", to: "c" },
    ],
    STEP,
  );
  expect(top.get("c")! - top.get("b")!).toBeGreaterThanOrEqual(STEP);
});

test("nothing is placed above the first row", () => {
  const top = placeVertically(
    [
      ["a", "b"],
      ["c", "d"],
    ],
    [
      { from: "a", to: "d" },
      { from: "b", to: "c" },
    ],
    STEP,
  );
  for (const value of top.values()) expect(value).toBeGreaterThanOrEqual(0);
});

test("without arrows every column keeps its rows", () => {
  const top = placeVertically([["a", "b"], ["c"]], [], STEP);
  expect([top.get("a"), top.get("b"), top.get("c")]).toEqual([0, STEP, 0]);
});
