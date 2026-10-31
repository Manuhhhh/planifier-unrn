import { expect, test } from "vite-plus/test";
import { arrangeColumns, countCrossings } from "./arrange.ts";
import type { Edge, Geometry } from "./arrange.ts";

const geometry: Geometry = { columnStep: 272, rowStep: 70, cardW: 216, cardH: 62 };
const edge = (from: string, to: string): Edge => ({ from, to });

test("untangles two arrows that cross between neighbouring columns", () => {
  const columns = [
    ["a", "b"],
    ["c", "d"],
  ];
  const edges = [edge("a", "d"), edge("b", "c")];
  expect(countCrossings(columns, edges, geometry)).toBe(1);

  const arranged = arrangeColumns(columns, edges, geometry);
  expect(countCrossings(arranged, edges, geometry)).toBe(0);
});

test("arrows that skip a column are untangled too", () => {
  const columns = [["a", "b"], ["x"], ["p", "q"]];
  const edges = [edge("a", "q"), edge("b", "p")];
  expect(countCrossings(columns, edges, geometry)).toBeGreaterThan(0);

  const arranged = arrangeColumns(columns, edges, geometry);
  expect(countCrossings(arranged, edges, geometry)).toBe(0);
});

test("keeps every course exactly once in its own column", () => {
  const columns = [
    ["a", "b", "c"],
    ["d", "e"],
    ["f", "g", "h"],
  ];
  const edges = [edge("a", "e"), edge("b", "d"), edge("c", "d"), edge("d", "h"), edge("e", "f")];
  const arranged = arrangeColumns(columns, edges, geometry);
  arranged.forEach((codes, index) => expect(codes.toSorted()).toEqual(columns[index]!.toSorted()));
});

test("never adds crossings, and leaves an already clean order alone", () => {
  const columns = [
    ["a", "b"],
    ["c", "d"],
  ];
  const clean = [edge("a", "c"), edge("b", "d")];
  expect(arrangeColumns(columns, clean, geometry)).toEqual(columns);

  const messy = [
    ["a", "b", "c", "d"],
    ["w", "x", "y", "z"],
  ];
  const edges = [edge("a", "z"), edge("b", "y"), edge("c", "x"), edge("d", "w"), edge("a", "w")];
  const before = countCrossings(messy, edges, geometry);
  expect(
    countCrossings(arrangeColumns(messy, edges, geometry), edges, geometry),
  ).toBeLessThanOrEqual(before);
});

test("does nothing without arrows and does not touch its input", () => {
  const columns = [["a", "b"], ["c"]];
  expect(arrangeColumns(columns, [], geometry)).toEqual(columns);
  const edges = [edge("a", "c"), edge("b", "c")];
  arrangeColumns(columns, edges, geometry);
  expect(columns).toEqual([["a", "b"], ["c"]]);
});

test("is deterministic", () => {
  const columns = [
    ["a", "b", "c"],
    ["d", "e", "f"],
  ];
  const edges = [edge("a", "f"), edge("b", "e"), edge("c", "d")];
  expect(arrangeColumns(columns, edges, geometry)).toEqual(
    arrangeColumns(columns, edges, geometry),
  );
});
