import { APPROVED_SLOT, planProblems, termOf } from "planner";
import type { Course, CourseCode, StudyPlan } from "planner";
import { ordinal } from "../labels.ts";
import { arrangeColumns } from "./arrange.ts";
import type { Edge } from "./arrange.ts";
import { arrowColours, arrowHeads } from "./colours.ts";
import { routePath, routeThroughGaps } from "./gapRoutes.ts";
import { impliedEdges } from "./implied.ts";
import { placeVertically } from "./place.ts";
import {
  BUILD_UP,
  CARD_DELAY,
  DASH,
  EDGE_DELAY,
  LEGEND_ROW_H,
  PALETTES,
  STAGGER,
  columnsOf,
  escape,
  forwardEdges,
  plural,
  text,
} from "./planGraph.ts";
import type { CardBox, GraphOptions, KindEdge, PlanGraph } from "./planGraph.ts";

/** Sizes of the drawing. The compact one packs things closer and writes larger, for a small preview. */
const REGULAR = {
  pad: 24,
  titleH: 76,
  titleSize: 24,
  subtitleSize: 13,
  /** Year name and the cuatrimestre names under it. */
  yearHead: 56,
  yearSize: 14,
  subSize: 11,
  /** Width of one cuatrimestre inside a year box. */
  subW: 132,
  yearInset: 10,
  /** Free space between year boxes: arrows from one year to the next curve through it. */
  yearGap: 56,
  nodeRx: 36,
  nodeRy: 17,
  codeSize: 11,
  rowStep: 76,
  minWidth: 560,
  /** Reference table under the map: columns of codes and names. */
  tableColW: 320,
  tableGap: 24,
  tableLine: 16,
  tableSize: 11,
  tableCodeW: 52,
  tableChars: 44,
  /** Room kept between an arrow and the ovals it passes, and under the last oval for arrows. */
  routeMargin: 5,
  routeRoom: 18,
};
const COMPACT: typeof REGULAR = {
  pad: 16,
  titleH: 58,
  titleSize: 24,
  subtitleSize: 14,
  yearHead: 52,
  yearSize: 17,
  subSize: 13,
  subW: 104,
  yearInset: 6,
  yearGap: 28,
  nodeRx: 38,
  nodeRy: 18,
  codeSize: 14,
  rowStep: 56,
  minWidth: 420,
  tableColW: 360,
  tableGap: 20,
  tableLine: 20,
  tableSize: 14,
  tableCodeW: 64,
  tableChars: 38,
  routeMargin: 4,
  routeRoom: 12,
};
type Geometry = typeof REGULAR;

/**
 * Orders and heights of the ovals, by the columns and arrows they were worked out for. Working
 * them out is the slow part, and hovering a course changes neither, so it is done once per plan.
 */
const layouts = new Map<string, { arranged: CourseCode[][]; offset: Map<CourseCode, number> }>();
const LAYOUTS_KEPT = 8;

function layoutOf(columns: CourseCode[][], edges: readonly Edge[], g: Geometry) {
  const key = JSON.stringify([g.rowStep, columns, edges.map((edge) => [edge.from, edge.to])]);
  let layout = layouts.get(key);
  if (layout === undefined) {
    // Display order only: the plan keeps the order the student gave, the picture avoids tangles.
    const arranged = arrangeColumns(columns, edges, {
      columnStep: g.subW + g.yearGap / 2,
      rowStep: g.rowStep,
      cardW: 2 * g.nodeRx,
      cardH: 2 * g.nodeRy,
    });
    layout = { arranged, offset: placeVertically(arranged, edges, g.rowStep) };
    layouts.set(key, layout);
    if (layouts.size > LAYOUTS_KEPT) layouts.delete(layouts.keys().next().value!);
  }
  return layout;
}

interface Group {
  label: string;
  /** Columns of the drawing (indexes into `slots`) inside this box. */
  columns: number[];
}

const truncate = (name: string, chars: number) =>
  name.length <= chars ? name : `${name.slice(0, chars - 1).trimEnd()}…`;

/**
 * Draws the plan as a compact map, like the official chart of the plan of studies: one rounded
 * box per year with its cuatrimestres side by side, each course an oval with its code, and every
 * correlative an arrow straight from one course to the other (solid: cursada aprobada, dashed:
 * final aprobado). Each course's arrows share a colour, so they can be followed across the map.
 * A table under it gives the name of each code. Arrows implied by a chain of others are left out.
 * With a `focus` course, everything not joined to it fades. `only`, `root`, `title` and `animate`
 * work as in the cards drawing; `about` draws just some courses with the ones one step from them.
 */
export function buildMapGraph(
  plan: StudyPlan,
  curriculum: readonly Course[],
  {
    focus,
    only: chosen,
    root,
    about,
    title,
    animate = false,
    theme = "light",
    compact = false,
  }: Omit<GraphOptions, "rows"> & {
    /** Closer together and with larger text, for a small preview. */
    compact?: boolean;
    /**
     * Courses the drawing is about, highlighted: they show with the courses they need and the
     * ones planned after them that need them, and only the arrows that touch them.
     */
    about?: ReadonlySet<CourseCode>;
  } = {},
): PlanGraph {
  const c = PALETTES[theme];
  const g = compact ? COMPACT : REGULAR;
  const byCode = new Map(curriculum.map((course) => [course.code, course]));
  const warned = new Set(
    planProblems(plan, curriculum).map((entry) => `${entry.slot}:${entry.code}`),
  );
  const touchesAbout = (edge: Edge) =>
    about === undefined || about.has(edge.from) || about.has(edge.to);
  let only = chosen;
  if (about !== undefined) {
    // One step means one arrow of the whole plan's drawing, so implied ones are not followed.
    const whole = forwardEdges(columnsOf(plan).columnOf, byCode);
    const wholeImplied = impliedEdges(whole);
    const steps = whole.filter((edge, index) => !wholeImplied[index] && touchesAbout(edge));
    only = new Set([...about, ...steps.flatMap((edge) => [edge.from, edge.to])]);
  }
  const { slots, coursesIn, columnOf } = columnsOf(plan, only);

  const edges = forwardEdges(columnOf, byCode).filter(touchesAbout);
  const implied = impliedEdges(edges);
  const touchesFocus = (edge: Edge) => edge.from === focus || edge.to === focus;
  // Implied arrows only show for the focused course, so its whole reach is visible.
  const drawn = edges.filter((edge, index) => !implied[index] || touchesFocus(edge));
  const kept = edges.filter((_, index) => !implied[index]);

  // Cuatrimestres of one calendar year share a box; the approved courses get one of their own.
  const groups: Group[] = [];
  slots.forEach((slot, column) => {
    const label = slot === APPROVED_SLOT ? "Ya aprobadas" : String(termOf(plan, slot).year);
    const last = groups.at(-1);
    if (last && last.label === label && slot !== APPROVED_SLOT) last.columns.push(column);
    else groups.push({ label, columns: [column] });
  });
  const subLabel = (slot: number) =>
    slot === APPROVED_SLOT ? "" : `${ordinal(termOf(plan, slot).term)} cuatri`;

  const centreX: number[] = [];
  const groupX: number[] = [];
  let cursor = g.pad;
  for (const group of groups) {
    groupX.push(cursor);
    group.columns.forEach((column, index) => {
      centreX[column] = cursor + g.yearInset + index * g.subW + g.subW / 2;
    });
    cursor += 2 * g.yearInset + group.columns.length * g.subW + g.yearGap;
  }
  const groupW = (group: Group) => 2 * g.yearInset + group.columns.length * g.subW;
  const mapW = cursor - g.yearGap - g.pad;
  const width = Math.max(g.minWidth, g.pad * 2 + mapW);

  const { arranged, offset } = layoutOf(slots.map(coursesIn), kept, g);
  const nodesH = Math.max(
    2 * g.nodeRy,
    ...[...offset.values()].map((value) => value + 2 * g.nodeRy),
  );

  const boardTop = g.pad + g.titleH;
  const nodesTop = boardTop + g.yearHead + 14;
  const boardH = g.yearHead + 14 + nodesH + g.routeRoom + 12;
  const centre = (code: CourseCode) => ({
    x: centreX[columnOf.get(code)!]!,
    y: nodesTop + offset.get(code)! + g.nodeRy,
  });

  // One colour per course that has arrows, handed out left to right, top to bottom.
  const colourOf = arrowColours(arranged.flat(), kept, theme);

  const related = new Set(
    focus === undefined
      ? []
      : [focus, ...edges.filter(touchesFocus).flatMap((edge) => [edge.from, edge.to])],
  );

  const delay = (seconds: number) =>
    animate ? ` style="animation-delay:${seconds.toFixed(2)}s"` : "";
  const highlighted = (code: CourseCode) => code === root || (about?.has(code) ?? false);

  const parts: string[] = [
    ...(animate ? [BUILD_UP] : []),
    `<rect width="${width}" height="HEIGHT" fill="${c.page}"/>`,
    text(g.pad, g.pad + g.titleSize, title ?? plan.name, g.titleSize, c.ink, 'font-weight="700"'),
    text(
      g.pad,
      g.pad + g.titleSize + 24,
      `Licenciatura en Sistemas · Plan 2022 · ${plural(columnOf.size)} · ${[...columnOf.keys()].reduce((sum, code) => sum + (byCode.get(code)?.hours ?? 0), 0)} h`,
      g.subtitleSize,
      c.muted,
    ),
  ];

  groups.forEach((group, index) => {
    const x = groupX[index]!;
    const w = groupW(group);
    parts.push(
      `<g class="year column"${delay(group.columns[0]! * STAGGER)}>`,
      `<rect x="${x}" y="${boardTop}" width="${w}" height="${boardH}" rx="22" fill="${c.column}" stroke="${c.line}"/>`,
      text(
        x + w / 2,
        boardTop + 6 + g.yearSize,
        group.label,
        g.yearSize,
        c.ink,
        'font-weight="600" text-anchor="middle"',
      ),
      ...group.columns.map((column) =>
        text(
          centreX[column]!,
          boardTop + g.yearHead - 12,
          subLabel(slots[column]!),
          g.subSize,
          c.muted,
          'text-anchor="middle"',
        ),
      ),
      `<line x1="${x}" y1="${boardTop + g.yearHead}" x2="${x + w}" y2="${boardTop + g.yearHead}" stroke="${c.line}" stroke-dasharray="2 3"/>`,
      `</g>`,
    );
  });

  // Arrows go under the ovals, so one that passes behind a course disappears there.
  // An arrow that skips cuatrimestres threads through the gaps between ovals, never across one.
  const heads = arrowHeads();
  const ovalOf = (code: CourseCode) => ({ column: columnOf.get(code)!, ...centre(code) });
  const routes = routeThroughGaps(
    drawn.map((edge) => ({ from: ovalOf(edge.from), to: ovalOf(edge.to) })),
    [...columnOf.keys()].map(ovalOf),
    {
      columnX: centreX,
      rx: g.nodeRx,
      ry: g.nodeRy,
      margin: g.routeMargin,
      top: nodesTop - 8,
      bottom: nodesTop + nodesH + g.routeRoom,
    },
  );
  const arrows = drawn.map((edge: KindEdge, index) => {
    const colour = colourOf.get(edge.from) ?? c.edge;
    const dash = edge.kind === "approved" ? ` stroke-dasharray="${DASH}"` : "";
    const fade = focus !== undefined && !touchesFocus(edge) ? ' opacity="0.15"' : "";
    const weight = focus !== undefined && touchesFocus(edge) ? "2.25" : "1.5";
    // A solid arrow is traced along once its target column is in; pathLength makes its length 1.
    const growing = animate
      ? `${edge.kind === "regular" ? ' pathLength="1"' : ""}${delay(EDGE_DELAY + columnOf.get(edge.to)! * STAGGER)}`
      : "";
    return {
      front: focus !== undefined && touchesFocus(edge),
      svg: `<path class="edge-${edge.kind}" data-from="${edge.from}" data-to="${edge.to}" d="${routePath(routes[index]!)}" fill="none" stroke="${colour}" stroke-width="${weight}"${dash}${fade}${growing} marker-end="url(#${heads.id(colour)})"/>`,
    };
  });
  // The focused arrows go last so the faded ones never cover them.
  arrows.sort((a, b) => Number(a.front) - Number(b.front));
  parts.push(...arrows.map((arrow) => arrow.svg));

  const cards: CardBox[] = [];
  slots.forEach((slot, column) => {
    for (const code of arranged[column]!) {
      const { x, y } = centre(code);
      const warning = warned.has(`${slot}:${code}`);
      const dimmed = focus !== undefined && !related.has(code);
      const colour = warning ? c.amber : (colourOf.get(code) ?? c.ink);
      const stroke = code === root ? c.accent : colour;
      const strokeW = code === focus || code === root ? 3 : warning ? 2 : 1.5;
      const state = code === focus ? " focused" : code === root ? " root" : dimmed ? " dimmed" : "";
      cards.push({
        code,
        name: byCode.get(code)?.name ?? code,
        x: x - g.nodeRx,
        y: y - g.nodeRy,
        width: 2 * g.nodeRx,
        height: 2 * g.nodeRy,
        colour: stroke,
      });
      parts.push(
        `<g class="card${state}" data-code="${code}"${dimmed ? ' opacity="0.3"' : ""}${delay(CARD_DELAY + column * STAGGER)}>`,
        // What the drawing is about gets a soft halo, so it reads at a glance among the rest.
        ...(highlighted(code)
          ? [
              `<ellipse cx="${x}" cy="${y}" rx="${g.nodeRx + 6}" ry="${g.nodeRy + 6}" fill="${c.accent}" opacity="0.22"/>`,
            ]
          : []),
        `<ellipse cx="${x}" cy="${y}" rx="${g.nodeRx}" ry="${g.nodeRy}" fill="${c.card}" stroke="${stroke}" stroke-width="${strokeW}"/>`,
        text(
          x,
          y + g.codeSize * 0.36,
          code,
          g.codeSize,
          c.ink,
          'font-weight="600" text-anchor="middle"',
        ),
        ...(warning
          ? [text(x + g.nodeRx - 2, y - g.nodeRy + 4, "!", 13, c.amber, 'font-weight="700"')]
          : []),
        `</g>`,
      );
    }
  });

  // Key of lines, then the table of names, laid out in as many columns as fit.
  const boardBottom = boardTop + boardH;
  const legend = [
    ...(kept.some((edge) => edge.kind === "regular")
      ? [{ dash: false, label: "Requiere la cursada aprobada", warning: false }]
      : []),
    ...(kept.some((edge) => edge.kind === "approved")
      ? [{ dash: true, label: "Requiere el final aprobado", warning: false }]
      : []),
    ...(implied.some(Boolean)
      ? [
          {
            dash: undefined,
            label: "Se omiten las correlativas implícitas en otra cadena",
            warning: false,
          },
        ]
      : []),
    ...(warned.size > 0
      ? [
          {
            dash: undefined,
            label: "No cumple correlatividades o cuatrimestre de dictado",
            warning: true,
          },
        ]
      : []),
  ];
  const legendRow = Math.max(LEGEND_ROW_H, g.tableLine + 4);
  let y = boardBottom + 28;
  if (legend.length > 0) {
    parts.push(text(g.pad, y, "Referencias", g.tableSize, c.ink, 'font-weight="600"'));
    legend.forEach((entry, index) => {
      const rowY = y + (index + 1) * legendRow;
      if (entry.warning) {
        parts.push(
          text(g.pad + 17, rowY, "!", 13, c.amber, 'font-weight="700" text-anchor="middle"'),
        );
      } else if (entry.dash !== undefined) {
        parts.push(
          `<line x1="${g.pad}" y1="${rowY - 4}" x2="${g.pad + 34}" y2="${rowY - 4}" stroke="${c.edge}" stroke-width="1.5"${entry.dash ? ` stroke-dasharray="${DASH}"` : ""} marker-end="url(#${heads.id(c.edge)})"/>`,
        );
      }
      parts.push(
        text(g.pad + 48, rowY, entry.label, g.tableSize, entry.warning ? c.amber : c.muted),
      );
    });
    y += legend.length * legendRow + 32;
  }

  // Each year is a block of the table; blocks go into the shortest column, like a masonry wall.
  const tableColumns = Math.max(
    1,
    Math.floor((width - 2 * g.pad + g.tableGap) / (g.tableColW + g.tableGap)),
  );
  const colBottom = Array.from({ length: tableColumns }, () => y);
  for (const group of groups) {
    const lines: { kind: "head" | "sub" | "row"; label: string; code?: CourseCode }[] = [
      { kind: "head", label: group.label },
    ];
    for (const column of group.columns) {
      const sub = subLabel(slots[column]!);
      if (sub !== "") lines.push({ kind: "sub", label: sub });
      for (const code of coursesIn(slots[column]!)) {
        lines.push({ kind: "row", label: byCode.get(code)?.name ?? code, code });
      }
    }
    const target = colBottom.indexOf(Math.min(...colBottom));
    const x = g.pad + target * (g.tableColW + g.tableGap);
    let lineY = colBottom[target]!;
    parts.push(
      `<line x1="${x}" y1="${lineY - g.tableLine + 2}" x2="${x + g.tableColW}" y2="${lineY - g.tableLine + 2}" stroke="${c.line}"/>`,
    );
    for (const line of lines) {
      if (line.kind === "head") {
        parts.push(text(x, lineY, line.label, g.tableSize + 1, c.ink, 'font-weight="700"'));
      } else if (line.kind === "sub") {
        parts.push(text(x, lineY, line.label, g.tableSize, c.muted, 'font-style="italic"'));
      } else {
        parts.push(
          text(
            x,
            lineY,
            line.code!,
            g.tableSize,
            colourOf.get(line.code!) ?? c.ink,
            'font-weight="700"',
          ),
          text(x + g.tableCodeW, lineY, truncate(line.label, g.tableChars), g.tableSize, c.ink),
        );
      }
      lineY += g.tableLine;
    }
    colBottom[target] = lineY + 22;
  }
  const height = Math.max(...colBottom) - 22 + g.pad;

  const defs = `<defs>${heads.defs()}</defs>`;
  const body = parts.join("").replace('height="HEIGHT"', `height="${height}"`);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(title ?? plan.name)}">` +
    defs +
    body +
    `</svg>`;
  return { svg, width, height, cards };
}
