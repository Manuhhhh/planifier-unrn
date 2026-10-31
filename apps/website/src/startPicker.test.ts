import { expect, test } from "vite-plus/test";
import { MAX_YEAR, MIN_YEAR, TERM_MONTHS, shiftYear } from "./startPicker.ts";

test("moves the year one step at a time", () => {
  expect(shiftYear(2027, 1)).toBe(2028);
  expect(shiftYear(2027, -1)).toBe(2026);
});

test("stops at the first and last selectable year", () => {
  expect(shiftYear(MIN_YEAR, -1)).toBe(MIN_YEAR);
  expect(shiftYear(MAX_YEAR, 1)).toBe(MAX_YEAR);
});

test("describes each cuatrimestre by its months", () => {
  expect(TERM_MONTHS).toEqual({ 1: "Marzo – Julio", 2: "Agosto – Diciembre" });
});
