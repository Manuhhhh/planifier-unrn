import { expect, test } from "vite-plus/test";
import { assignPorts } from "./ports.ts";

test("a lone arrow leaves and arrives at the middle of the card edge", () => {
  const ports = assignPorts([{ from: "A", to: "B" }], [{ leaving: 50, arriving: 10 }], 60);
  expect(ports.leave).toEqual([0]);
  expect(ports.arrive).toEqual([0]);
});

test("arrows of one card fan out in the order of where their other end lies", () => {
  const edges = [
    { from: "A", to: "LOW" },
    { from: "A", to: "HIGH" },
    { from: "A", to: "MID" },
  ];
  const heading = [
    { leaving: 300, arriving: 0 },
    { leaving: -100, arriving: 0 },
    { leaving: 100, arriving: 0 },
  ];
  const { leave, arrive } = assignPorts(edges, heading, 60);
  expect(leave[1]!).toBeLessThan(leave[2]!);
  expect(leave[2]!).toBeLessThan(leave[0]!);
  expect(leave[2]).toBe(0);
  // Each target gets a single arrow, so it arrives at the middle.
  expect(arrive).toEqual([0, 0, 0]);
});

test("ports stay inside the card however many arrows share it", () => {
  const edges = Array.from({ length: 12 }, (_, index) => ({ from: `S${index}`, to: "T" }));
  const heading = edges.map((_, index) => ({ leaving: 0, arriving: index * 10 }));
  const { arrive } = assignPorts(edges, heading, 60);
  expect(Math.max(...arrive.map(Math.abs))).toBeLessThanOrEqual(20);
});
