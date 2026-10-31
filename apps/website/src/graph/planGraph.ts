import { APPROVED_SLOT, planProblems, slotCourses } from "planner";
import type { Course, CourseCode, StudyPlan } from "planner";
import { slotLabel } from "../labels.ts";
import { arrangeColumns, edgeCurve } from "./arrange.ts";
import type { Edge } from "./arrange.ts";
import { AREAS, areaOf } from "./areas.ts";
import type { Area } from "./areas.ts";
import { splitCrowded } from "./crowding.ts";
import { impliedEdges } from "./implied.ts";
import { assignLanes } from "./lanes.ts";
import type { Arc } from "./lanes.ts";
import { placeVertically } from "./place.ts";
import { assignPorts } from "./ports.ts";

export interface CardBox {
  code: CourseCode;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlanGraph {
  svg: string;
  width: number;
  height: number;
  /** Where each course card is drawn, so a page can lay hover targets over the picture. */
  cards: CardBox[];
}

export interface GraphOptions {
  /** Course to bring forward: it and its arrows stay, everything else fades. */
  focus?: CourseCode;
  /** Courses to draw; the others, and the columns they leave empty, are left out. */
  only?: ReadonlySet<CourseCode>;
  /** Course the drawing is about: outlined, with nothing faded. */
  root?: CourseCode;
  /** Heading in place of the plan name. */
  title?: string;
  /** Builds the drawing up (columns, then cards, then arrows) when it is shown. */
  animate?: boolean;
  /**
   * `split` (the default) gives the arrows that skip cuatrimestres boards of their own, as many as
   * keep them uncrowded; `single` runs them around the one board.
   */
  rows?: GraphRows;
  /** Colours for a light (the default) or a dark page. */
  theme?: GraphTheme;
}

export type GraphRows = "split" | "single";

export interface Neighbours {
  /** Courses it needs directly. */
  needs: Set<CourseCode>;
  /** Courses that need it directly. */
  unlocks: Set<CourseCode>;
}

const PAD = 24;
const COLUMN_W = 232;
/** Room between cuatrimestres: arrows curve through it, and the ones that skip turn outward in it. */
const GAP = 72;
const HEAD_H = 52;
const TITLE_H = 76;
/** Heading above each board, and the free space between the two boards. */
const SECTION_H = 28;
const SECTION_GAP = 40;
const CARD_H = 56;
const CARD_GAP = 8;
const CARD_INSET = 8;
const CARD_W = COLUMN_W - 2 * CARD_INSET;
const LEGEND_ROW_H = 20;
const MIN_WIDTH = 420;
/** Free space kept between the board and its first outer lane, and between lanes. */
const LANE_MARGIN = 22;
const LANE_STEP = 12;
/** Past this, distant arrows move on to another board. */
const CROWDING = { lanes: 3, ends: 3 };
/** Characters of the course name that fit on one line of a card. */
const LINE_CHARS = 30;
/** Rough width of one character of the 11px key text, to lay the area swatches in rows. */
const KEY_CHAR_W = 5.6;
const FONT = "font-family=\"Poppins, 'Segoe UI', Helvetica, Arial, sans-serif\"";

export type GraphTheme = "light" | "dark";

/** Colours of the drawing. The layout is the same in both themes; only these change. */
const PALETTES = {
  light: {
    page: "#ffffff",
    column: "#fafaf9",
    card: "#ffffff",
    ink: "#1c1917",
    muted: "#78716c",
    line: "#e7e5e4",
    amber: "#b45309",
    edge: "#78716c",
    area: "color",
  },
  dark: {
    page: "#1c1917",
    column: "#231f1d",
    card: "#2e2926",
    ink: "#f5f5f4",
    muted: "#a8a29e",
    line: "#44403c",
    amber: "#fbbf24",
    edge: "#a8a29e",
    area: "dark",
  },
} as const satisfies Record<GraphTheme, { area: "color" | "dark" } & Record<string, string>>;
const DASH = "5 4";

/** Seconds between one column and the next as the drawing builds up, and when each part starts. */
const STAGGER = 0.12;
const CARD_DELAY = 0.1;
const EDGE_DELAY = 0.35;

/**
 * Styles of a drawing that builds up: columns fade in, cards rise into place, then solid arrows
 * are traced and dashed ones fade in. Each part's `animation-delay` sets the order. Nothing
 * moves for someone who asked for reduced motion.
 */
const BUILD_UP =
  "<style>" +
  "@keyframes fade{from{opacity:0}to{opacity:1}}" +
  "@keyframes rise{from{opacity:0;transform:translateY(10px) scale(.96)}to{opacity:1;transform:none}}" +
  "@keyframes trace{0%{stroke-dashoffset:1;opacity:0}15%{opacity:1}100%{stroke-dashoffset:0;opacity:1}}" +
  ".column{animation:fade .35s ease-out both}" +
  ".card{animation:rise .45s cubic-bezier(.2,.8,.2,1) both;transform-box:fill-box;transform-origin:center}" +
  ".edge-regular{stroke-dasharray:1;animation:trace .6s ease-in-out both}" +
  ".edge-approved{animation:fade .5s ease-out both}" +
  "@media (prefers-reduced-motion:reduce){*{animation:none!important}.edge-regular{stroke-dasharray:none}}" +
  "</style>";

export const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Greedy word wrap into at most two lines, with an ellipsis when the second one overflows. */
export function wrapName(name: string, lineChars = LINE_CHARS): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of name.split(/\s+/).filter(Boolean)) {
    const next = current === "" ? word : `${current} ${word}`;
    if (next.length <= lineChars || current === "") {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current !== "") lines.push(current);
  if (lines.length <= 2) return lines;
  const rest = lines.slice(1).join(" ");
  return [lines[0]!, `${rest.slice(0, lineChars - 1).trimEnd()}…`];
}

const text = (
  x: number,
  y: number,
  content: string,
  size: number,
  fill: string,
  extra = "",
): string =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" ${FONT} ${extra}>${escape(content)}</text>`;

const plural = (count: number) => `${count} ${count === 1 ? "materia" : "materias"}`;

/** Curve between cuatrimestres that follow each other. */
function directPath(x1: number, y1: number, x2: number, y2: number): string {
  const [from, first, second, to] = edgeCurve({ x: x1, y: y1 }, { x: x2, y: y2 });
  return `M${from.x} ${from.y} C${first.x} ${first.y} ${second.x} ${second.y} ${to.x} ${to.y}`;
}

/**
 * Route for an arrow that skips cuatrimestres: an S-curve out of the source up (or down) to
 * `laneY` outside the board, a straight run along that lane, and a mirrored S-curve into the target.
 */
function outerPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  leaveX: number,
  arriveX: number,
  laneY: number,
): string {
  const end = to.x - 2;
  const leaving = (from.x + leaveX) / 2;
  const arriving = (arriveX + end) / 2;
  return [
    `M${from.x} ${from.y}`,
    `C${leaving} ${from.y} ${leaving} ${laneY} ${leaveX} ${laneY}`,
    `L${arriveX} ${laneY}`,
    `C${arriving} ${laneY} ${arriving} ${to.y} ${end} ${to.y}`,
  ].join(" ");
}

type KindEdge = Edge & { kind: "regular" | "approved" };

/** Columns of the drawing (the approved courses, then each cuatrimestre) and their courses. */
function columnsOf(plan: StudyPlan, only?: ReadonlySet<CourseCode>) {
  const coursesIn = (slot: number) =>
    slotCourses(plan, slot).filter((code) => only === undefined || only.has(code));
  const slots = [...(plan.approved.length > 0 ? [APPROVED_SLOT] : []), ...plan.terms.keys()].filter(
    (slot) => only === undefined || coursesIn(slot).length > 0,
  );
  const columnOf = new Map<CourseCode, number>();
  slots.forEach((slot, column) => coursesIn(slot).forEach((code) => columnOf.set(code, column)));
  return { slots, coursesIn, columnOf };
}

/** Arrows from each course to the ones it needs, only those that go forward in time. */
function forwardEdges(
  columnOf: ReadonlyMap<CourseCode, number>,
  byCode: ReadonlyMap<CourseCode, Course>,
): KindEdge[] {
  const edges: KindEdge[] = [];
  for (const [code, column] of columnOf) {
    const { enrollRegular = [], enrollApproved = [] } = byCode.get(code)?.correlatives ?? {};
    const add = (needs: readonly CourseCode[], kind: KindEdge["kind"]) => {
      for (const from of needs) {
        if ((columnOf.get(from) ?? column) < column) edges.push({ from, to: code, kind });
      }
    };
    add(enrollRegular, "regular");
    add(enrollApproved, "approved");
  }
  return edges;
}

/**
 * Courses of the plan one step away from `code`: the ones it needs and the ones that need it.
 * One also reached through another (A → B → C with A → C too) is two steps away and left out,
 * just as the graph leaves out that arrow.
 */
export function neighboursOf(
  plan: StudyPlan,
  curriculum: readonly Course[],
  code: CourseCode,
): Neighbours {
  const byCode = new Map(curriculum.map((course) => [course.code, course]));
  const edges = forwardEdges(columnsOf(plan).columnOf, byCode);
  const implied = impliedEdges(edges);
  const steps = edges.filter((_, index) => !implied[index]);
  return {
    needs: new Set(steps.filter((edge) => edge.to === code).map((edge) => edge.from)),
    unlocks: new Set(steps.filter((edge) => edge.from === code).map((edge) => edge.to)),
  };
}

/**
 * Draws the plan as boards with one column per cuatrimestre (and one for the approved courses),
 * each with its courses. Arrows join a course to the ones it needs when both are in the plan
 * (solid: cursada aprobada, dashed: final aprobado). The first board only has the arrows between
 * neighbouring columns; the boards below repeat the cards joined by arrows that skip
 * cuatrimestres, which run around them in lanes, farther out the more they skip. Arrows implied by
 * a chain of others are left out. The arrows of a card fan out along its edge so each one can be
 * told apart. Cards slide vertically to sit level with what they are joined to, and their bar
 * shows the course's area. A key at the bottom explains lines and colours. Courses that break a
 * rule get an amber bar. With a `focus` course, everything not joined to it fades and its implied
 * arrows show too, without moving anything; `only`, `root` and `title` draw a part of the plan
 * about one course, and `animate` builds it up on screen. The result is a plain, self-contained
 * SVG so it can be shown, saved, or rasterized as is.
 */
export function buildPlanGraph(
  plan: StudyPlan,
  curriculum: readonly Course[],
  { focus, only, root, title, animate = false, rows = "split", theme = "light" }: GraphOptions = {},
): PlanGraph {
  const c = PALETTES[theme];
  const byCode = new Map(curriculum.map((course) => [course.code, course]));
  const warned = new Set(
    planProblems(plan, curriculum).map((entry) => `${entry.slot}:${entry.code}`),
  );

  const { slots, coursesIn, columnOf } = columnsOf(plan, only);

  const hoursOf = (codes: readonly CourseCode[]) =>
    codes.reduce((sum, code) => sum + (byCode.get(code)?.hours ?? 0), 0);
  const total = columnOf.size;
  const totalHours = hoursOf([...columnOf.keys()]);

  // Only arrows that go forward in time: anything else is already flagged as a warning.
  const edges = forwardEdges(columnOf, byCode);
  const implied = impliedEdges(edges);
  const kept = edges.filter((_, index) => !implied[index]);
  const touchesFocus = (edge: Edge) => edge.from === focus || edge.to === focus;
  // Implied arrows of the focused course are drawn on top of the layout, never part of it.
  const extra = edges.filter((edge, index) => implied[index] && touchesFocus(edge));

  const hasKind = (kind: KindEdge["kind"]) => kept.some((edge) => edge.kind === kind);
  const span = (edge: Edge) => columnOf.get(edge.to)! - columnOf.get(edge.from)!;
  const direct = kept.filter((edge) => span(edge) === 1);
  const skipping = kept.filter((edge) => span(edge) > 1);
  const hasSecond = skipping.length > 0;

  // Display order only: the plan keeps the order the student gave, the picture avoids tangles.
  const rowStep = CARD_H + CARD_GAP;
  const arranged = arrangeColumns(slots.map(coursesIn), direct, {
    columnStep: COLUMN_W + GAP,
    rowStep,
    cardW: CARD_W,
    cardH: CARD_H,
  });
  const offset = placeVertically(arranged, direct, rowStep);
  const cardsH = Math.max(CARD_H, ...[...offset.values()].map((value) => value + CARD_H));

  // Which side of its board each skipping arrow takes. They spread over as many boards as
  // needed so that no board stacks too many lanes or brings too many arrows to one card.
  const sideOf = (edge: Edge): Arc["side"] =>
    offset.get(edge.from)! + offset.get(edge.to)! + CARD_H <= cardsH ? "up" : "down";
  const far = skipping.map((edge) => ({
    from: edge.from,
    to: edge.to,
    arc: { from: columnOf.get(edge.from)!, to: columnOf.get(edge.to)!, side: sideOf(edge) },
  }));
  const boardOf = rows === "single" ? far.map(() => 0) : splitCrowded(far, CROWDING);
  const channel = (count: number) => (count > 0 ? LANE_MARGIN + count * LANE_STEP : 0);
  const distant = Array.from(
    { length: Math.max(0, ...boardOf.map((board) => board + 1)) },
    (_, board) => {
      const members = far.flatMap((_, index) => (boardOf[index] === board ? [index] : []));
      const arcs = members.map((index) => far[index]!.arc);
      const lanes = assignLanes(arcs);
      const laneCount = (side: Arc["side"]) =>
        Math.max(
          0,
          ...arcs.flatMap((arc, index) => (arc.side === side ? [lanes[index]! + 1] : [])),
        );
      const maxLane = Math.max(0, ...lanes);
      return {
        edges: members.map((index) => skipping[index]!),
        arcs,
        lanes,
        topChannel: channel(laneCount("up")),
        bottomChannel: channel(laneCount("down")),
        slotStep: maxLane > 0 ? Math.min(5, (GAP - 24) / maxLane) : 0,
      };
    },
  );

  const width = Math.max(MIN_WIDTH, PAD * 2 + slots.length * COLUMN_W + (slots.length - 1) * GAP);

  const hasWarnings = warned.size > 0;
  const legend = [
    ...(hasKind("regular")
      ? [{ kind: "regular" as const, label: "Requiere la cursada aprobada" }]
      : []),
    ...(hasKind("approved")
      ? [{ kind: "approved" as const, label: "Requiere el final aprobado" }]
      : []),
    ...(hasSecond
      ? [{ kind: "outer" as const, label: "Rodea el tablero: hay cuatrimestres de por medio" }]
      : []),
    ...(implied.some(Boolean)
      ? [{ kind: "note" as const, label: "Se omiten las correlativas implícitas en otra cadena" }]
      : []),
    ...(hasWarnings
      ? [
          {
            kind: "warning" as const,
            label: "No cumple correlatividades o cuatrimestre de dictado",
          },
        ]
      : []),
  ];
  // Area swatches go side by side, wrapping onto a new row when the board is too narrow.
  const areas = (Object.keys(AREAS) as Area[]).filter((area) =>
    [...columnOf.keys()].some((code) => areaOf(code) === area),
  );
  const areaRows: { area: Area; x: number }[][] = [];
  let cursor = Infinity;
  for (const area of areas) {
    const swatchW = 12 + AREAS[area].label.length * KEY_CHAR_W + 20;
    if (cursor + swatchW > width - PAD) {
      areaRows.push([]);
      cursor = PAD;
    }
    areaRows.at(-1)!.push({ area, x: cursor });
    cursor += swatchW;
  }
  const keyRows = legend.length + areaRows.length;
  const legendH = keyRows > 0 ? 28 + keyRows * LEGEND_ROW_H : 0;

  // Vertical layout: title, first board, then each board of distant arrows with its lanes. On a
  // single row the distant arrows run around the first board instead.
  const around = rows === "single" ? distant[0] : undefined;
  const separate = rows === "single" ? [] : distant;
  const bodyH = HEAD_H + 8 + cardsH + CARD_GAP;
  const firstTop = PAD + TITLE_H + SECTION_H + (around?.topChannel ?? 0);
  let boardsBottom = firstTop + bodyH + (around?.bottomChannel ?? 0);
  const distantTops = separate.map((board) => {
    const top = boardsBottom + SECTION_GAP + SECTION_H + board.topChannel;
    boardsBottom = top + bodyH + board.bottomChannel;
    return top;
  });
  const height = boardsBottom + legendH + PAD;

  const heading: string[] = [
    `<rect width="${width}" height="${height}" fill="${c.page}"/>`,
    text(PAD, PAD + 24, title ?? plan.name, 24, c.ink, 'font-weight="700"'),
    text(
      PAD,
      PAD + 48,
      `Licenciatura en Sistemas · Plan 2022 · ${plural(total)} · ${totalHours} h`,
      13,
      c.muted,
    ),
  ];
  const sectionTitle = (top: number, title: string, note: string) => [
    text(PAD, top - SECTION_H + 16, title, 14, c.ink, 'font-weight="600"'),
    text(PAD + title.length * 8 + 12, top - SECTION_H + 16, note, 11, c.muted),
  ];

  const related = new Set(
    focus === undefined
      ? []
      : [focus, ...edges.filter(touchesFocus).flatMap((edge) => [edge.from, edge.to])],
  );
  const columnX = (column: number) => PAD + column * (COLUMN_W + GAP);
  const boxes: CardBox[] = [];

  const delay = (seconds: number) =>
    animate ? ` style="animation-delay:${seconds.toFixed(2)}s"` : "";

  /**
   * Columns and cards of one board whose top edge is at `top`. With `only`, the other cards are
   * left out; the ones drawn keep their places, so they line up with the first board.
   */
  const drawColumns = (top: number, only?: ReadonlySet<CourseCode>) => {
    const columns: string[] = [];
    const cards: string[] = [];
    const cardsTop = top + HEAD_H + 8;
    slots.forEach((slot, column) => {
      const x = columnX(column);
      const codes = arranged[column]!;

      columns.push(
        `<g class="column"${delay(column * STAGGER)}>`,
        `<rect x="${x}" y="${top}" width="${COLUMN_W}" height="${bodyH}" rx="10" fill="${c.column}" stroke="${c.line}"/>`,
        text(x + 14, top + 24, slotLabel(plan, slot), 13, c.ink, 'font-weight="600"'),
        text(
          x + 14,
          top + 42,
          slot === APPROVED_SLOT
            ? plural(codes.length)
            : `${plural(codes.length)} · ${hoursOf(codes)} h`,
          11,
          c.muted,
        ),
        `<line x1="${x}" y1="${top + HEAD_H}" x2="${x + COLUMN_W}" y2="${top + HEAD_H}" stroke="${c.line}"/>`,
      );
      if (codes.length === 0) {
        columns.push(text(x + 14, top + HEAD_H + 28, "Vacío", 12, c.muted, 'font-style="italic"'));
      }
      columns.push("</g>");

      for (const code of codes) {
        if (only !== undefined && !only.has(code)) continue;
        const course = byCode.get(code);
        const y = cardsTop + offset.get(code)!;
        const warning = warned.has(`${slot}:${code}`);
        const name = course?.name ?? code;
        const lines = wrapName(name);
        // The code and hours sit right under the name, not pinned to the bottom of the card.
        const metaY = y + 20 + lines.length * 15 + 2;
        const dimmed = focus !== undefined && !related.has(code);
        const state =
          code === focus ? " focused" : code === root ? " root" : dimmed ? " dimmed" : "";
        const stroke =
          code === focus || code === root
            ? `stroke="${c.ink}" stroke-width="2"`
            : `stroke="${warning ? c.amber : c.line}"`;

        boxes.push({ code, name, x: x + CARD_INSET, y, width: CARD_W, height: CARD_H });
        cards.push(
          `<g class="card${state}" data-code="${code}"${dimmed ? ' opacity="0.3"' : ""}${delay(CARD_DELAY + column * STAGGER)}>`,
          `<rect x="${x + CARD_INSET}" y="${y}" width="${CARD_W}" height="${CARD_H}" rx="8" fill="${c.card}" ${stroke}/>`,
          `<rect x="${x + CARD_INSET}" y="${y + 6}" width="4" height="${CARD_H - 12}" rx="2" fill="${warning ? c.amber : AREAS[areaOf(code)][c.area]}"/>`,
          ...lines.map((line, index) =>
            text(x + 22, y + 20 + index * 15, line, 12, c.ink, 'font-weight="600"'),
          ),
          text(
            x + 22,
            metaY,
            course ? `${code} · ${course.hours} h` : code,
            10,
            warning ? c.amber : c.muted,
          ),
        );
        if (warning) {
          cards.push(
            text(x + COLUMN_W - 20, metaY, "!", 13, c.amber, 'font-weight="700" text-anchor="end"'),
          );
        }
        cards.push("</g>");
      }
    });
    return { columns, cards };
  };

  const draw = (edge: KindEdge, d: string) => {
    // The ends are tagged so a page can pick out a course's arrows without redrawing anything.
    const ends = `data-from="${edge.from}" data-to="${edge.to}"`;
    const dash = edge.kind === "approved" ? ` stroke-dasharray="${DASH}"` : "";
    if (focus === undefined) {
      // A solid arrow is drawn along its length once its target column is in; pathLength
      // makes that length 1 whatever the route.
      const growing = animate
        ? `${edge.kind === "regular" ? ' pathLength="1"' : ""}${delay(EDGE_DELAY + columnOf.get(edge.to)! * STAGGER)}`
        : "";
      return `<path class="edge-${edge.kind}" ${ends} d="${d}" fill="none" stroke="${c.edge}" stroke-width="1.5"${dash}${growing} marker-end="url(#arrow)"/>`;
    }
    return touchesFocus(edge)
      ? `<path class="edge-${edge.kind} focused" ${ends} d="${d}" fill="none" stroke="${c.ink}" stroke-width="2.25"${dash} marker-end="url(#arrow-focus)"/>`
      : `<path class="edge-${edge.kind}" ${ends} d="${d}" fill="none" stroke="${c.edge}" stroke-width="1.5" opacity="0.15"${dash} marker-end="url(#arrow)"/>`;
  };

  /**
   * Arrows of one board. On a board of distant arrows (`around`) they run around it in lanes;
   * otherwise they curve straight across. `joining` are the implied arrows of the focus, drawn
   * without a port of their own so nothing else moves.
   */
  const drawArrows = (
    top: number,
    routed: readonly KindEdge[],
    joining: readonly KindEdge[],
    around?: (typeof distant)[number],
  ) => {
    const laneY = routed.map((_, index) => {
      if (around === undefined) return undefined;
      const out = LANE_MARGIN + around.lanes[index]! * LANE_STEP;
      return around.arcs[index]!.side === "up" ? top - out : top + bodyH + out;
    });
    const centre = (code: CourseCode) => top + HEAD_H + 8 + offset.get(code)! + CARD_H / 2;
    const ports = assignPorts(
      routed,
      routed.map((edge, index) => ({
        leaving: laneY[index] ?? centre(edge.to),
        arriving: laneY[index] ?? centre(edge.from),
      })),
      CARD_H,
    );
    const leaves = (edge: Edge, port: number) => ({
      x: columnX(columnOf.get(edge.from)!) + COLUMN_W - CARD_INSET,
      y: centre(edge.from) + port,
    });
    const arrives = (edge: Edge, port: number) => ({
      x: columnX(columnOf.get(edge.to)!) + CARD_INSET,
      y: centre(edge.to) + port,
    });

    const arrows = routed.map((edge, index) => {
      const from = leaves(edge, ports.leave[index]!);
      const to = arrives(edge, ports.arrive[index]!);
      const lane = laneY[index];
      if (around === undefined || lane === undefined) {
        return draw(edge, directPath(from.x, from.y, to.x, to.y));
      }
      // Outer lanes turn closest to the columns, so the arcs nest instead of crossing.
      const turn = around.lanes[index]! * around.slotStep;
      const leaveX = columnX(around.arcs[index]!.from) + COLUMN_W + GAP - 6 - turn;
      const arriveX = columnX(around.arcs[index]!.to) - GAP + 6 + turn;
      return draw(edge, outerPath(from, to, leaveX, arriveX, lane));
    });
    for (const edge of joining) {
      const from = leaves(edge, 0);
      const to = arrives(edge, 0);
      arrows.push(draw(edge, directPath(from.x, from.y, to.x, to.y)));
    }
    // The focused arrows go last so the faded ones never cover them.
    if (focus !== undefined) {
      arrows.sort((a, b) => Number(a.includes(" focused")) - Number(b.includes(" focused")));
    }
    return arrows;
  };

  // Arrows go under the cards, so one that passes behind a card simply disappears there.
  const first = drawColumns(firstTop);
  const parts = [
    ...(rows === "single"
      ? sectionTitle(
          firstTop - (around?.topChannel ?? 0),
          "Todas las correlativas",
          "Las que saltan cuatrimestres rodean el tablero",
        )
      : sectionTitle(
          firstTop,
          "Cuatrimestre a cuatrimestre",
          "Correlativas entre cuatrimestres seguidos",
        )),
    ...first.columns,
    ...drawArrows(
      firstTop,
      direct,
      // Implied arrows of the focus go here, where every card is, so they never dangle.
      extra,
    ),
    ...(around ? drawArrows(firstTop, around.edges, [], around) : []),
    ...first.cards,
  ];
  separate.forEach((board, index) => {
    const top = distantTops[index]!;
    const joined = new Set(board.edges.flatMap((edge) => [edge.from, edge.to]));
    const drawn = drawColumns(top, joined);
    const numbered = separate.length > 1 ? ` (${index + 1} de ${separate.length})` : "";
    parts.push(
      ...sectionTitle(
        top - board.topChannel,
        `Correlativas a distancia${numbered}`,
        "Las que saltan uno o más cuatrimestres",
      ),
      ...drawn.columns,
      ...drawArrows(top, board.edges, [], board),
      ...drawn.cards,
    );
  });

  const key: string[] = [];
  if (keyRows > 0) {
    const keyTop = boardsBottom + 24;
    const rowY = (row: number) => keyTop + 8 + (row + 1) * LEGEND_ROW_H - 6;
    key.push(text(PAD, keyTop, "Referencias", 11, c.ink, 'font-weight="600"'));
    legend.forEach((entry, index) => {
      const y = rowY(index);
      if (entry.kind === "warning") {
        key.push(text(PAD + 17, y, "!", 13, c.amber, 'font-weight="700" text-anchor="middle"'));
      } else if (entry.kind === "outer") {
        key.push(
          `<path d="M${PAD} ${y - 3} L${PAD + 6} ${y - 3} Q${PAD + 10} ${y - 3} ${PAD + 10} ${y - 7} Q${PAD + 10} ${y - 11} ${PAD + 14} ${y - 11} L${PAD + 20} ${y - 11} Q${PAD + 24} ${y - 11} ${PAD + 24} ${y - 7} Q${PAD + 24} ${y - 3} ${PAD + 28} ${y - 3} L${PAD + 34} ${y - 3}" fill="none" stroke="${c.edge}" stroke-width="1.5" marker-end="url(#arrow)"/>`,
        );
      } else if (entry.kind !== "note") {
        key.push(
          `<line x1="${PAD}" y1="${y - 4}" x2="${PAD + 34}" y2="${y - 4}" stroke="${c.edge}" stroke-width="1.5"${entry.kind === "approved" ? ` stroke-dasharray="${DASH}"` : ""} marker-end="url(#arrow)"/>`,
        );
      }
      key.push(text(PAD + 48, y, entry.label, 11, entry.kind === "warning" ? c.amber : c.muted));
    });
    areaRows.forEach((row, index) => {
      const y = rowY(legend.length + index);
      for (const { area, x } of row) {
        key.push(
          `<rect x="${x}" y="${y - 10}" width="4" height="12" rx="2" fill="${AREAS[area][c.area]}"/>`,
          text(x + 12, y, AREAS[area].label, 11, c.muted),
        );
      }
    });
  }

  // Markers scale with the stroke, so the thicker focused arrows get a smaller head to match.
  const marker = (id: string, fill: string, size: number) =>
    `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="${size}" markerHeight="${size}" orient="auto">` +
    `<path d="M0 0L10 5L0 10z" fill="${fill}"/></marker>`;
  const defs = `<defs>${marker("arrow", c.edge, 7)}${focus === undefined ? "" : marker("arrow-focus", c.ink, 5)}</defs>`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(title ?? plan.name)}">` +
    [defs, ...(animate ? [BUILD_UP] : []), ...heading, ...parts, ...key].join("") +
    `</svg>`;
  return { svg, width, height, cards: boxes };
}
