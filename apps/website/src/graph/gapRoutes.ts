import type { Point } from "./arrange.ts";

/** One course drawn as an oval, the only thing an arrow must not cross. */
export interface Oval {
  column: number;
  x: number;
  y: number;
}

export interface GapGeometry {
  /** Centre of each column of ovals. */
  columnX: readonly number[];
  rx: number;
  ry: number;
  /** Space kept free between an arrow and any oval it passes. */
  margin: number;
  /** Band the arrows may use, top and bottom. */
  top: number;
  bottom: number;
}

export interface GapEdge {
  from: Oval;
  to: Oval;
}

type Segment = [Point, Point, Point, Point];

interface Interval {
  lo: number;
  hi: number;
}

/** Free heights of one column: the bands between its ovals, and above and below them. */
function freeIntervals(ys: readonly number[], g: GapGeometry): Interval[] {
  const reach = g.ry + g.margin;
  const intervals: Interval[] = [];
  let lo = g.top;
  for (const y of [...ys].sort((a, b) => a - b)) {
    if (y - reach >= lo) intervals.push({ lo, hi: y - reach });
    lo = Math.max(lo, y + reach);
  }
  if (g.bottom >= lo) intervals.push({ lo, hi: g.bottom });
  return intervals;
}

const nearest = (intervals: readonly Interval[], y: number) => {
  let best = 0;
  let bestDistance = Infinity;
  intervals.forEach((interval, index) => {
    const distance = y < interval.lo ? interval.lo - y : y > interval.hi ? y - interval.hi : 0;
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
};

/** S-curve between two points, flat at both ends. */
const sCurve = (a: Point, b: Point): Segment => {
  const middle = (a.x + b.x) / 2;
  return [a, { x: middle, y: a.y }, { x: middle, y: b.y }, b];
};

/**
 * Routes arrows between ovals laid out in columns so that none crosses an oval. An arrow leaves
 * the right edge of its source and reaches the left edge of its target; at every column it skips
 * it runs flat through a free band between that column's ovals, the one nearest its way, and only
 * bends in the empty space between columns. Arrows sharing a band are spread across it so they
 * stay apart. Each route is a list of cubic segments; `head` is left free before the target for
 * the arrow head.
 */
export function routeThroughGaps(
  edges: readonly GapEdge[],
  ovals: readonly Oval[],
  g: GapGeometry,
  head = 2,
): Segment[][] {
  const byColumn = new Map<number, number[]>();
  for (const oval of ovals)
    byColumn.set(oval.column, [...(byColumn.get(oval.column) ?? []), oval.y]);
  const intervalsOf = new Map<number, Interval[]>();
  const intervals = (column: number) => {
    if (!intervalsOf.has(column))
      intervalsOf.set(column, freeIntervals(byColumn.get(column) ?? [], g));
    return intervalsOf.get(column)!;
  };

  // First pass: each arrow picks a band per skipped column, heading from where it is to its target.
  const picks = edges.map((edge) => {
    const chosen: { column: number; band: number; wanted: number }[] = [];
    let at = { x: g.columnX[edge.from.column]!, y: edge.from.y };
    for (let column = edge.from.column + 1; column < edge.to.column; column++) {
      const x = g.columnX[column]!;
      const share = (x - at.x) / (edge.to.x - at.x);
      const wanted = at.y + (edge.to.y - at.y) * share;
      const free = intervals(column);
      const band = nearest(free, wanted);
      const { lo, hi } = free[band]!;
      chosen.push({ column, band, wanted });
      at = { x, y: Math.min(hi, Math.max(lo, wanted)) };
    }
    return chosen;
  });

  // Second pass: arrows in the same band are spaced evenly, in the order they want to be.
  const sharing = new Map<string, { edge: number; step: number; wanted: number }[]>();
  picks.forEach((chosen, edge) =>
    chosen.forEach(({ column, band, wanted }, step) => {
      const key = `${column}:${band}`;
      sharing.set(key, [...(sharing.get(key) ?? []), { edge, step, wanted }]);
    }),
  );
  const heights = picks.map((chosen) => chosen.map(() => 0));
  for (const [key, members] of sharing) {
    const [column, band] = key.split(":").map(Number) as [number, number];
    const { lo, hi } = intervals(column)[band]!;
    members.sort((a, b) => a.wanted - b.wanted);
    members.forEach((member, index) => {
      heights[member.edge]![member.step] =
        members.length === 1
          ? Math.min(hi, Math.max(lo, member.wanted))
          : lo + ((hi - lo) * (index + 1)) / (members.length + 1);
    });
  }

  return edges.map((edge, index) => {
    const segments: Segment[] = [];
    let at: Point = { x: edge.from.x + g.rx, y: edge.from.y };
    picks[index]!.forEach(({ column }, step) => {
      const y = heights[index]![step]!;
      const x = g.columnX[column]!;
      const enter = { x: x - g.rx - g.margin, y };
      const leave = { x: x + g.rx + g.margin, y };
      segments.push(sCurve(at, enter), [enter, enter, leave, leave]);
      at = leave;
    });
    segments.push(sCurve(at, { x: edge.to.x - g.rx - head, y: edge.to.y }));
    return segments;
  });
}

/** SVG path data of a route, as a single run of cubic curves. */
export const routePath = (segments: readonly Segment[]): string =>
  `M${segments[0]![0].x} ${segments[0]![0].y} ` +
  segments.map(([, a, b, c]) => `C${a.x} ${a.y} ${b.x} ${b.y} ${c.x} ${c.y}`).join(" ");
