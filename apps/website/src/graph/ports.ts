import type { CourseCode } from "planner";
import type { Edge } from "./arrange.ts";

/** Room kept free at the top and bottom of a card edge, and the most two ports are apart. */
const MARGIN = 10;
const MAX_STEP = 10;

/** Where each arrow heads once it leaves its source, and where it comes from as it arrives. */
export interface Heading {
  leaving: number;
  arriving: number;
}

export interface Ports {
  /** Offset from the middle of the card edge, per edge. */
  leave: number[];
  arrive: number[];
}

/**
 * Point on the card edge where each arrow leaves its source and reaches its target. The arrows
 * of one card fan out along its edge in the order of where their other end lies, so they keep
 * apart and do not cross right at the card.
 */
export function assignPorts(
  edges: readonly Edge[],
  heading: readonly Heading[],
  height: number,
): Ports {
  const spread = (end: "from" | "to", key: keyof Heading) => {
    const offsets = edges.map(() => 0);
    const groups = new Map<CourseCode, number[]>();
    edges.forEach((edge, index) =>
      groups.set(edge[end], [...(groups.get(edge[end]) ?? []), index]),
    );
    for (const indexes of groups.values()) {
      indexes.sort((a, b) => heading[a]![key] - heading[b]![key] || a - b);
      const step =
        indexes.length > 1 ? Math.min(MAX_STEP, (height - 2 * MARGIN) / (indexes.length - 1)) : 0;
      indexes.forEach((edge, rank) => {
        offsets[edge] = (rank - (indexes.length - 1) / 2) * step;
      });
    }
    return offsets;
  };
  return { leave: spread("from", "leaving"), arrive: spread("to", "arriving") };
}
