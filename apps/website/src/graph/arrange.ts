import type { CourseCode } from "planner";

export interface Point {
  x: number;
  y: number;
}

export interface Edge {
  from: CourseCode;
  to: CourseCode;
}

/** Where the cards sit: a grid of columns and rows, which is all the crossings depend on. */
export interface Geometry {
  columnStep: number;
  rowStep: number;
  cardW: number;
  cardH: number;
}

/** How far short of the target card an arrow stops, leaving room for its head. */
const HEAD = 2;
/** Odd on purpose: two mirrored curves cross at t = 0.5, which must fall inside a segment. */
const SAMPLES = 15;
/** Passes of the local search over every column; each one that improves is kept. */
const MAX_PASSES = 20;

/** Control points of the curve from the right edge of one card to the left edge of another. */
export function edgeCurve(from: Point, to: Point): [Point, Point, Point, Point] {
  const bend = (to.x - from.x) / 2;
  return [
    from,
    { x: from.x + bend, y: from.y },
    { x: to.x - bend, y: to.y },
    { x: to.x - HEAD, y: to.y },
  ];
}

function sample([p0, p1, p2, p3]: [Point, Point, Point, Point]): Point[] {
  return Array.from({ length: SAMPLES + 1 }, (_, index) => {
    const t = index / SAMPLES;
    const u = 1 - t;
    const a = u * u * u;
    const b = 3 * u * u * t;
    const c = 3 * u * t * t;
    const d = t * t * t;
    return {
      x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
      y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
    };
  });
}

const side = (a: Point, b: Point, c: Point) =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

/** Proper crossing only: touching at a shared end (arrows meeting at one card) does not count. */
const segmentsCross = (p1: Point, p2: Point, p3: Point, p4: Point) =>
  side(p3, p4, p1) * side(p3, p4, p2) < 0 && side(p1, p2, p3) * side(p1, p2, p4) < 0;

function pairCrossings(a: Point[], b: Point[]): number {
  let count = 0;
  for (let i = 0; i < a.length - 1; i++) {
    for (let j = 0; j < b.length - 1; j++) {
      if (segmentsCross(a[i]!, a[i + 1]!, b[j]!, b[j + 1]!)) count++;
    }
  }
  return count;
}

type Columns = CourseCode[][];

/** Curves as drawn, for the columns in the given order. */
class Drawing {
  private position = new Map<CourseCode, { column: number; row: number }>();
  private curves: Point[][];
  /** Edges touching each course, so a move only recomputes what it can change. */
  private touching = new Map<CourseCode, number[]>();
  private columns: Columns;
  private edges: readonly Edge[];
  private geometry: Geometry;

  constructor(columns: Columns, edges: readonly Edge[], geometry: Geometry) {
    this.columns = columns;
    this.edges = edges;
    this.geometry = geometry;
    columns.forEach((codes, column) =>
      codes.forEach((code, row) => this.position.set(code, { column, row })),
    );
    edges.forEach((edge, index) => {
      for (const code of [edge.from, edge.to]) {
        this.touching.set(code, [...(this.touching.get(code) ?? []), index]);
      }
    });
    this.curves = edges.map((_, index) => this.curveOf(index));
  }

  private curveOf(index: number): Point[] {
    const { cardW, cardH, columnStep, rowStep } = this.geometry;
    const from = this.position.get(this.edges[index]!.from)!;
    const to = this.position.get(this.edges[index]!.to)!;
    return sample(
      edgeCurve(
        { x: from.column * columnStep + cardW, y: from.row * rowStep + cardH / 2 },
        { x: to.column * columnStep, y: to.row * rowStep + cardH / 2 },
      ),
    );
  }

  total(): number {
    let count = 0;
    for (let i = 0; i < this.curves.length; i++) {
      for (let j = i + 1; j < this.curves.length; j++) {
        count += pairCrossings(this.curves[i]!, this.curves[j]!);
      }
    }
    return count;
  }

  /** Crossings that involve at least one edge of the given courses. */
  private around(codes: readonly CourseCode[]): number {
    const mine = new Set(codes.flatMap((code) => this.touching.get(code) ?? []));
    let count = 0;
    for (const i of mine) {
      for (let j = 0; j < this.curves.length; j++) {
        if (j === i || (mine.has(j) && j < i)) continue;
        count += pairCrossings(this.curves[i]!, this.curves[j]!);
      }
    }
    return count;
  }

  /** Swaps two rows of a column and returns how many crossings that removed (negative: added). */
  swap(column: number, a: number, b: number): number {
    const codes = this.columns[column]!;
    const moved = [codes[a]!, codes[b]!];
    const before = this.around(moved);
    this.exchange(column, a, b);
    const after = this.around(moved);
    return before - after;
  }

  exchange(column: number, a: number, b: number): void {
    const codes = this.columns[column]!;
    [codes[a], codes[b]] = [codes[b]!, codes[a]!];
    this.position.set(codes[a]!, { column, row: a });
    this.position.set(codes[b]!, { column, row: b });
    for (const code of [codes[a]!, codes[b]!]) {
      for (const index of this.touching.get(code) ?? []) this.curves[index] = this.curveOf(index);
    }
  }
}

/** Number of crossings between the arrows when the columns are laid out in this order. */
export function countCrossings(
  columns: readonly (readonly CourseCode[])[],
  edges: readonly Edge[],
  geometry: Geometry,
): number {
  return new Drawing(
    columns.map((codes) => [...codes]),
    edges,
    geometry,
  ).total();
}

/** Reorders each column by the average row of its neighbours on one side. */
function barycenter(columns: Columns, edges: readonly Edge[], direction: 1 | -1): Columns {
  const next = columns.map((codes) => [...codes]);
  const rows = new Map<CourseCode, number>();
  const columnOf = new Map<CourseCode, number>();
  const index = () =>
    next.forEach((codes, column) =>
      codes.forEach((code, row) => (rows.set(code, row), columnOf.set(code, column))),
    );
  index();

  const order = Array.from(next.keys());
  for (const column of direction === 1 ? order : order.toReversed()) {
    const keyed = next[column]!.map((code, row) => {
      const neighbours = edges.flatMap((edge) => {
        const other = edge.from === code ? edge.to : edge.to === code ? edge.from : undefined;
        if (other === undefined) return [];
        const there = columnOf.get(other)!;
        return (direction === 1 ? there < column : there > column) ? [rows.get(other)!] : [];
      });
      const key =
        neighbours.length > 0 ? neighbours.reduce((a, b) => a + b, 0) / neighbours.length : row;
      return { code, row, key };
    });
    next[column] = keyed
      .toSorted((a, b) => a.key - b.key || a.row - b.row)
      .map((entry) => entry.code);
    index();
  }
  return next;
}

/** Swaps pairs of rows within columns for as long as that removes crossings; returns the result. */
function improve(start: Columns, edges: readonly Edge[], geometry: Geometry): Columns {
  const columns = start.map((codes) => [...codes]);
  const drawing = new Drawing(columns, edges, geometry);
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    let improved = false;
    for (const [column, codes] of columns.entries()) {
      for (let a = 0; a < codes.length; a++) {
        for (let b = a + 1; b < codes.length; b++) {
          if (drawing.swap(column, a, b) > 0) improved = true;
          else drawing.exchange(column, a, b);
        }
      }
    }
    if (!improved) break;
  }
  return columns;
}

/**
 * Orders the courses inside each column so the arrows cross as little as possible. It tries a
 * few barycenter orderings (a standard layered-drawing heuristic), keeps the best, then swaps
 * pairs of rows while that removes crossings. Deterministic, and never worse than the input.
 */
export function arrangeColumns(
  columns: readonly (readonly CourseCode[])[],
  edges: readonly Edge[],
  geometry: Geometry,
): CourseCode[][] {
  const original: Columns = columns.map((codes) => [...codes]);
  if (edges.length < 2) return original;

  let best = original;
  let bestCost = countCrossings(best, edges, geometry);
  let sweep = original;
  for (let pass = 0; pass < 4 && bestCost > 0; pass++) {
    sweep = barycenter(sweep, edges, pass % 2 === 0 ? 1 : -1);
    const cost = countCrossings(sweep, edges, geometry);
    if (cost < bestCost) {
      best = sweep;
      bestCost = cost;
    }
  }
  return bestCost > 0 ? improve(best, edges, geometry) : best;
}
