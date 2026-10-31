import type { Term } from "planner";

export const MIN_YEAR = 2000;
export const MAX_YEAR = 2100;

export const TERM_MONTHS: Record<Term, string> = { 1: "Marzo – Julio", 2: "Agosto – Diciembre" };

/** The year moved by `delta`, never leaving the selectable range. */
export function shiftYear(year: number, delta: number): number {
  return Math.min(Math.max(year + delta, MIN_YEAR), MAX_YEAR);
}
