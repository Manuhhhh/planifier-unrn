import { relationsOf } from "planner";
import type { Course, CourseCode, Relation } from "planner";

export const NODE_W = 190;
export const NODE_H = 30;
const ROW_GAP = 8;
const COL_GAP = 56;
const PAD = 12;
const CAPTION_H = 18;
/** Height of the one-line key under the diagram, drawn only when there are arrows. */
export const LEGEND_H = 22;

export interface Placed {
  code: CourseCode;
  x: number;
  y: number;
  kind: Relation["kind"];
}

export interface DiagramLayout {
  width: number;
  height: number;
  /** Courses the focused one needs, drawn to its left. */
  left: Placed[];
  /** Courses the focused one enables, drawn to its right. */
  right: Placed[];
  center: Placed;
  /** Arrow kinds drawn, so the key explains only what is on screen; empty means no key. */
  legend: Relation["kind"][];
  /** Where the key starts, just under the nodes. */
  legendY: number;
}

function column(items: Relation[], x: number, height: number): Placed[] {
  const total = items.length * (NODE_H + ROW_GAP) - ROW_GAP;
  const top = PAD + CAPTION_H + (height - 2 * PAD - CAPTION_H - total) / 2;
  return items.map((item, index) => ({ ...item, x, y: top + index * (NODE_H + ROW_GAP) }));
}

/** Positions of the focused course and its neighbours; only columns that have courses take space. */
export function layoutDiagram(code: CourseCode, curriculum: readonly Course[]): DiagramLayout {
  const { requires, enables } = relationsOf(code, curriculum);
  const rows = Math.max(requires.length, enables.length, 1);
  const bodyH = 2 * PAD + CAPTION_H + rows * (NODE_H + ROW_GAP) - ROW_GAP;
  const kinds = new Set([...requires, ...enables].map((relation) => relation.kind));
  const legend = (["regular", "approved"] as const).filter((kind) => kinds.has(kind));
  const height = bodyH + (legend.length > 0 ? LEGEND_H : 0);
  const centerX = PAD + (requires.length > 0 ? NODE_W + COL_GAP : 0);
  const rightX = centerX + NODE_W + COL_GAP;
  const width = (enables.length > 0 ? rightX + NODE_W : centerX + NODE_W) + PAD;

  return {
    width,
    height,
    left: column(requires, PAD, bodyH),
    right: column(enables, rightX, bodyH),
    center: column([{ code, kind: "regular" }], centerX, bodyH)[0]!,
    legend,
    legendY: bodyH - PAD / 2,
  };
}

/** Curve from the right edge of `from` to the left edge of `to`, stopping just short for the arrow head. */
export function edgePath(from: Placed, to: Placed): string {
  const x1 = from.x + NODE_W;
  const y1 = from.y + NODE_H / 2;
  const x2 = to.x;
  const y2 = to.y + NODE_H / 2;
  const bend = (x2 - x1) / 2;
  return `M${x1} ${y1} C${x1 + bend} ${y1} ${x2 - bend} ${y2} ${x2 - 2} ${y2}`;
}
