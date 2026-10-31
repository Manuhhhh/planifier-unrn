import type { CourseCode } from "planner";
import type { Edge } from "./arrange.ts";

const PASSES = 8;
/** How much a course without neighbours cares about staying where it is. */
const LOOSE = 0.1;

interface Block {
  sum: number;
  weight: number;
  count: number;
}

/** Weighted least-squares fit that never decreases (pool adjacent violators). */
function isotonic(values: readonly number[], weights: readonly number[]): number[] {
  const blocks: Block[] = [];
  values.forEach((value, index) => {
    blocks.push({ sum: value * weights[index]!, weight: weights[index]!, count: 1 });
    while (blocks.length > 1) {
      const last = blocks[blocks.length - 1]!;
      const before = blocks[blocks.length - 2]!;
      if (before.sum / before.weight <= last.sum / last.weight) break;
      blocks.splice(blocks.length - 2, 2, {
        sum: before.sum + last.sum,
        weight: before.weight + last.weight,
        count: before.count + last.count,
      });
    }
  });
  return blocks.flatMap((block) =>
    Array.from({ length: block.count }, () => block.sum / block.weight),
  );
}

/**
 * Vertical position (top, from the first row) of every course. Order inside a column is kept and
 * cards are `step` apart at least, but they are free to slide so that a course sits level with the
 * ones it is joined to by `edges`, which lets those arrows run straight instead of bending.
 */
export function placeVertically(
  columns: readonly (readonly CourseCode[])[],
  edges: readonly Edge[],
  step: number,
): Map<CourseCode, number> {
  const neighbours = new Map<CourseCode, CourseCode[]>();
  for (const { from, to } of edges) {
    neighbours.set(from, [...(neighbours.get(from) ?? []), to]);
    neighbours.set(to, [...(neighbours.get(to) ?? []), from]);
  }

  const top = new Map<CourseCode, number>();
  columns.forEach((codes) => codes.forEach((code, row) => top.set(code, row * step)));

  const order = Array.from(columns.keys());
  for (let pass = 0; pass < PASSES; pass++) {
    for (const column of pass % 2 === 0 ? order : order.toReversed()) {
      const codes = columns[column]!;
      const wanted = codes.map((code, row) => {
        const near = neighbours.get(code) ?? [];
        const target =
          near.length > 0
            ? near.reduce((sum, other) => sum + top.get(other)!, 0) / near.length
            : top.get(code)!;
        return { target: target - row * step, weight: near.length > 0 ? 1 : LOOSE };
      });
      const fitted = isotonic(
        wanted.map((entry) => entry.target),
        wanted.map((entry) => entry.weight),
      );
      codes.forEach((code, row) => top.set(code, Math.max(0, fitted[row]!) + row * step));
    }
  }

  // The highest card of the whole board sits on the first row; the rest keep their distances to it.
  const highest = Math.min(
    ...columns.filter((codes) => codes.length > 0).map((codes) => top.get(codes[0]!)!),
  );
  if (Number.isFinite(highest)) {
    for (const [code, value] of top) top.set(code, Math.round(value - highest));
  }
  return top;
}
