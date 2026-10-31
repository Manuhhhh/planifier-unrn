import { expect, test } from "vite-plus/test";
import { impliedEdges } from "./implied.ts";

test("an arrow already covered by a chain of others is implied", () => {
  const edges = [
    { from: "A", to: "B" },
    { from: "B", to: "C" },
    { from: "A", to: "C" },
  ];
  expect(impliedEdges(edges)).toEqual([false, false, true]);
});

test("chains of any length count", () => {
  const edges = [
    { from: "A", to: "D" },
    { from: "A", to: "B" },
    { from: "B", to: "C" },
    { from: "C", to: "D" },
  ];
  expect(impliedEdges(edges)).toEqual([true, false, false, false]);
});

test("two arrows between the same pair do not imply each other", () => {
  const edges = [
    { from: "A", to: "B" },
    { from: "A", to: "B" },
  ];
  expect(impliedEdges(edges)).toEqual([false, false]);
});

test("unrelated arrows are kept", () => {
  const edges = [
    { from: "A", to: "B" },
    { from: "C", to: "D" },
  ];
  expect(impliedEdges(edges)).toEqual([false, false]);
});
