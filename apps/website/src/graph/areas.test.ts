import { CURRICULUM } from "planner";
import { expect, test } from "vite-plus/test";
import { AREAS, areaOf, hasArea } from "./areas.ts";

test("every course of the curriculum has an area chosen on purpose", () => {
  expect(CURRICULUM.filter((course) => !hasArea(course.code))).toEqual([]);
});

test("areas have distinct colours, in light and in dark", () => {
  for (const key of ["color", "dark"] as const) {
    const colours = Object.values(AREAS).map((area) => area[key]);
    expect(new Set(colours).size).toBe(colours.length);
  }
});

test("an unknown code falls back to general training", () => {
  expect(areaOf("X0000")).toBe("general");
  expect(areaOf("V1281")).toBe("math");
});
