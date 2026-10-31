import { expect, test } from "vite-plus/test";
import { rangeBetween } from "./dragRange.ts";

const order = ["A", "B", "C", "D", "E"];

test("covers every course between the one pressed and the one under the pointer", () => {
  expect(rangeBetween(order, "B", "D")).toEqual(["B", "C", "D"]);
});

test("dragging upwards keeps the order of the list", () => {
  expect(rangeBetween(order, "D", "B")).toEqual(["B", "C", "D"]);
});

test("without moving to another course the range is the pressed one alone", () => {
  expect(rangeBetween(order, "C", "C")).toEqual(["C"]);
});

test("a course that left the list ends the range at the pressed one", () => {
  expect(rangeBetween(order, "B", "Z")).toEqual(["B"]);
  expect(rangeBetween(order, "Z", "B")).toEqual([]);
});
