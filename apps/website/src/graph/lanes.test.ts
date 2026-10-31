import { expect, test } from "vite-plus/test";
import { assignLanes } from "./lanes.ts";
import type { Arc } from "./lanes.ts";

const arc = (from: number, to: number, side: Arc["side"] = "up"): Arc => ({ from, to, side });

test("an arc that skips more cuatrimestres runs farther out than the shorter ones it covers", () => {
  const [short, mid, long] = assignLanes([arc(0, 2), arc(1, 3), arc(0, 4)]);
  expect(short).toBe(0);
  expect(mid).toBeGreaterThan(short!);
  expect(long).toBeGreaterThan(mid!);
});

test("arcs that share no columns share a lane", () => {
  expect(assignLanes([arc(0, 2), arc(2, 4), arc(4, 6)])).toEqual([0, 0, 0]);
});

test("each side has its own lanes", () => {
  expect(assignLanes([arc(0, 3, "up"), arc(0, 3, "down")])).toEqual([0, 0]);
});

test("lanes follow the input order of the arcs, not their length", () => {
  const lanes = assignLanes([arc(0, 5), arc(0, 2)]);
  expect(lanes[1]).toBe(0);
  expect(lanes[0]).toBe(1);
});
