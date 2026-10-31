import { expect, test } from "vite-plus/test";
import { CURRICULUM } from "planner";
import { LEGEND_H, NODE_H, NODE_W, layoutDiagram } from "./layout.ts";

test("a course with neither correlatives nor dependents is a single node", () => {
  const layout = layoutDiagram("V1379", CURRICULUM);
  expect(layout.left).toEqual([]);
  expect(layout.right).toEqual([]);
  expect(layout.center.x).toBe(12);
  expect(layout.width).toBe(NODE_W + 24);
});

test("columns only take space when they have courses", () => {
  const onlyEnables = layoutDiagram("V1281", CURRICULUM);
  const both = layoutDiagram("V1291", CURRICULUM);
  expect(onlyEnables.left).toEqual([]);
  expect(onlyEnables.right.map((node) => node.code).toSorted()).toEqual(["V1283", "V1285"]);
  expect(both.left.map((node) => node.code)).toEqual(["V1287"]);
  expect(both.width).toBeGreaterThan(onlyEnables.width);
});

test("every node fits inside the diagram and none overlap in a column", () => {
  const layout = layoutDiagram("V1291", CURRICULUM);
  for (const node of [...layout.left, ...layout.right, layout.center]) {
    expect(node.x).toBeGreaterThanOrEqual(0);
    expect(node.y).toBeGreaterThanOrEqual(0);
    expect(node.x + NODE_W).toBeLessThanOrEqual(layout.width);
    expect(node.y + NODE_H).toBeLessThanOrEqual(layout.height);
  }
  const ys = layout.right.map((node) => node.y).toSorted((a, b) => a - b);
  ys.slice(1).forEach((y, index) => expect(y - ys[index]!).toBeGreaterThanOrEqual(NODE_H));
});

test("the key appears only when there are arrows, and lists only the kinds drawn", () => {
  const alone = layoutDiagram("V1379", CURRICULUM);
  expect(alone.legend).toEqual([]);

  const connected = layoutDiagram("V1291", CURRICULUM);
  expect(connected.legend.length).toBeGreaterThan(0);
  const kinds = [...connected.left, ...connected.right].map((node) => node.kind);
  expect(connected.legend).toEqual(
    (["regular", "approved"] as const).filter((kind) => kinds.includes(kind)),
  );
});

test("the key takes its own row under the nodes", () => {
  const layout = layoutDiagram("V1291", CURRICULUM);
  const lowest = Math.max(
    ...[...layout.left, ...layout.right, layout.center].map((n) => n.y + NODE_H),
  );
  expect(layout.legendY).toBeGreaterThanOrEqual(lowest);
  expect(layout.legendY + LEGEND_H).toBeLessThanOrEqual(layout.height);
});
