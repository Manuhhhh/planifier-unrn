import { APPROVED_SLOT, planProblems } from "planner";
import type { Course, CourseCode, StudyPlan } from "planner";
import { slotLabel } from "../labels.ts";
import type { Edge } from "./arrange.ts";
import { AREAS, areaOf } from "./areas.ts";
import type { Area } from "./areas.ts";
import { impliedEdges } from "./implied.ts";
import {
  BUILD_UP,
  CARD_DELAY,
  CARD_GAP,
  CARD_H,
  DASH,
  EDGE_DELAY,
  KEY_CHAR_W,
  LEGEND_ROW_H,
  LINE_CHARS,
  PALETTES,
  STAGGER,
  columnsOf,
  escape,
  forwardEdges,
  plural,
  text,
  wrapName,
} from "./planGraph.ts";
import type { CardBox, GraphOptions, KindEdge, PlanGraph } from "./planGraph.ts";

const PAD = 12;
/** Width of the picture when there is room for it; it grows only to keep the cards readable. */
const WIDTH = 340;
const MIN_PANEL = 214;
const HEAD_H = 44;
const PANEL_INSET = 8;
const SECTION_GAP = 14;
const LANE_STEP = 7;
const LANE_MARGIN = 12;
/** Corner radius of the arrows, and the space kept between two arrows sharing a lane. */
const RADIUS = 4;
const LANE_CLEARANCE = 6;
/** Width of the card the name wraps for in the wide drawing. */
const WIDE_CARD_W = 216;

type Side = "left" | "right";

interface Route {
  edge: KindEdge;
  side: Side;
  lane: number;
  /** Where the arrow leaves its first card and arrives at its second, before the ports spread them. */
  fromY: number;
  toY: number;
}

/**
 * Draws the plan for a narrow screen: the cuatrimestres one under another, time running down the
 * page, each with its courses in a single column. Arrows run along the margins on both sides,
 * leaving a card by its side and coming back into the one that needs it, so no arrow crosses a
 * card and the picture never grows wider with more cuatrimestres. It takes the options of the
 * wide drawing (`rows` aside, there is nothing to split) and its cards are tagged the same way,
 * so a page can treat both alike.
 */
export function buildVerticalGraph(
  plan: StudyPlan,
  curriculum: readonly Course[],
  { focus, only, root, title, animate = false, theme = "light" }: GraphOptions = {},
): PlanGraph {
  const c = PALETTES[theme];
  const byCode = new Map(curriculum.map((course) => [course.code, course]));
  const warned = new Set(
    planProblems(plan, curriculum).map((entry) => `${entry.slot}:${entry.code}`),
  );
  const { slots, coursesIn, columnOf } = columnsOf(plan, only);
  const hoursOf = (codes: readonly CourseCode[]) =>
    codes.reduce((sum, code) => sum + (byCode.get(code)?.hours ?? 0), 0);

  const edges = forwardEdges(columnOf, byCode);
  const implied = impliedEdges(edges);
  const kept = edges.filter((_, index) => !implied[index]);
  const touchesFocus = (edge: Edge) => edge.from === focus || edge.to === focus;
  // Implied arrows of the focused course are drawn too, on top of the layout.
  const extra = edges.filter((edge, index) => implied[index] && touchesFocus(edge));
  const hasKind = (kind: KindEdge["kind"]) => kept.some((edge) => edge.kind === kind);
  const related = new Set(
    focus === undefined
      ? []
      : [focus, ...edges.filter(touchesFocus).flatMap((edge) => [edge.from, edge.to])],
  );

  const heading = wrapName(title ?? plan.name, 26);
  const subtitle = [
    "Licenciatura en Sistemas · Plan 2022",
    `${plural(columnOf.size)} · ${hoursOf([...columnOf.keys()])} h`,
  ];
  // Baselines: the heading lines, then the subtitle lines under the last of them.
  const headingY = (line: number) => PAD + 18 + line * 22;
  const subtitleY = (line: number) => headingY(heading.length - 1) + 22 + line * 16;
  const titleH = subtitleY(subtitle.length - 1) + 22;

  // Rows first: where every card sits depends on nothing but the order of the cuatrimestres.
  const rowStep = CARD_H + CARD_GAP;
  const sections = slots.map((slot, column) => ({ slot, column, codes: coursesIn(slot) }));
  const cardY = new Map<CourseCode, number>();
  const sectionTops: { top: number; height: number }[] = [];
  let cursor = titleH;
  for (const { codes } of sections) {
    const body = codes.length === 0 ? 32 : codes.length * rowStep + CARD_GAP / 2;
    sectionTops.push({ top: cursor, height: HEAD_H + body });
    codes.forEach((code, index) => cardY.set(code, cursor + HEAD_H + 4 + index * rowStep));
    cursor += HEAD_H + body + SECTION_GAP;
  }
  const sectionsBottom = cursor - (sections.length > 0 ? SECTION_GAP : 0);

  // Lanes: shorter arrows take the ones closest to the cards; two arrows share a lane only when
  // they do not overlap along the page. The side with the freer lane gets the arrow.
  const middle = (code: CourseCode) => cardY.get(code)! + CARD_H / 2;
  const routes: Route[] = [...kept]
    .sort((a, b) => middle(b.to) - middle(b.from) - (middle(a.to) - middle(a.from)))
    .reverse()
    .map((edge) => ({
      edge,
      side: "left" as Side,
      lane: 0,
      fromY: middle(edge.from),
      toY: middle(edge.to),
    }));
  const taken: Record<Side, Route[]> = { left: [], right: [] };
  const freeLane = (side: Side, route: Route) => {
    let lane = 0;
    while (
      taken[side].some(
        (other) =>
          other.lane === lane &&
          other.fromY - LANE_CLEARANCE < route.toY &&
          route.fromY - LANE_CLEARANCE < other.toY,
      )
    ) {
      lane++;
    }
    return lane;
  };
  for (const route of routes) {
    const left = freeLane("left", route);
    const right = freeLane("right", route);
    route.side =
      left < right || (left === right && taken.left.length <= taken.right.length)
        ? "left"
        : "right";
    route.lane = route.side === "left" ? left : right;
    taken[route.side].push(route);
  }
  const lanesOn = (side: Side) => Math.max(0, ...taken[side].map((route) => route.lane + 1));
  const gutter = (side: Side) => {
    const lanes = lanesOn(side);
    return lanes === 0 ? 0 : LANE_MARGIN + lanes * LANE_STEP;
  };

  const width = Math.max(WIDTH, 2 * PAD + gutter("left") + gutter("right") + MIN_PANEL);
  const panelX = PAD + gutter("left");
  const panelW = width - PAD - gutter("right") - panelX;
  const cardX = panelX + PANEL_INSET;
  const cardW = panelW - 2 * PANEL_INSET;
  const lineChars = Math.floor((LINE_CHARS * cardW) / WIDE_CARD_W);
  const laneX = (route: Route) =>
    route.side === "left"
      ? panelX - LANE_MARGIN + 2 - route.lane * LANE_STEP
      : panelX + panelW + LANE_MARGIN - 2 + route.lane * LANE_STEP;

  // Ports: the arrows meeting at one side of a card fan out along it, in the order of where they
  // go, so each can be told apart.
  const ports = new Map<string, number>();
  const gather = new Map<string, { key: string; other: number }[]>();
  routes.forEach((route, index) => {
    const add = (code: CourseCode, role: string, other: number) => {
      const group = `${code}:${route.side}`;
      const list = gather.get(group) ?? [];
      list.push({ key: `${index}:${role}`, other });
      gather.set(group, list);
    };
    add(route.edge.from, "from", route.toY);
    add(route.edge.to, "to", route.fromY);
  });
  for (const [group, list] of gather) {
    const code = group.slice(0, group.indexOf(":"));
    list.sort((a, b) => a.other - b.other);
    const step = list.length > 1 ? Math.min(9, (CARD_H - 24) / (list.length - 1)) : 0;
    const first = middle(code) - ((list.length - 1) * step) / 2;
    list.forEach((entry, order) => ports.set(entry.key, first + order * step));
  }

  const delay = (seconds: number) =>
    animate ? ` style="animation-delay:${seconds.toFixed(2)}s"` : "";
  const boxes: CardBox[] = [];
  const columns: string[] = [];
  const cards: string[] = [];

  sections.forEach(({ slot, column, codes }, index) => {
    const { top, height } = sectionTops[index]!;
    columns.push(
      `<g class="column"${delay(column * STAGGER)}>`,
      `<rect x="${panelX}" y="${top}" width="${panelW}" height="${height}" rx="10" fill="${c.column}" stroke="${c.line}"/>`,
      text(panelX + 14, top + 22, slotLabel(plan, slot), 13, c.ink, 'font-weight="600"'),
      text(
        panelX + 14,
        top + 38,
        slot === APPROVED_SLOT
          ? plural(codes.length)
          : `${plural(codes.length)} · ${hoursOf(codes)} h`,
        11,
        c.muted,
      ),
      `<line x1="${panelX}" y1="${top + HEAD_H}" x2="${panelX + panelW}" y2="${top + HEAD_H}" stroke="${c.line}"/>`,
    );
    if (codes.length === 0) {
      columns.push(
        text(panelX + 14, top + HEAD_H + 20, "Vacío", 12, c.muted, 'font-style="italic"'),
      );
    }
    columns.push("</g>");

    for (const code of codes) {
      const course = byCode.get(code);
      const y = cardY.get(code)!;
      const warning = warned.has(`${slot}:${code}`);
      const name = course?.name ?? code;
      const lines = wrapName(name, lineChars);
      const metaY = y + 20 + lines.length * 15 + 2;
      const dimmed = focus !== undefined && !related.has(code);
      const state = code === focus ? " focused" : code === root ? " root" : dimmed ? " dimmed" : "";
      const stroke =
        code === root
          ? `stroke="${c.accent}" stroke-width="2.5"`
          : code === focus
            ? `stroke="${c.ink}" stroke-width="2"`
            : `stroke="${warning ? c.amber : c.line}"`;

      boxes.push({ code, name, x: cardX, y, width: cardW, height: CARD_H });
      cards.push(
        `<g class="card${state}" data-code="${code}"${dimmed ? ' opacity="0.3"' : ""}${delay(CARD_DELAY + column * STAGGER)}>`,
        // The clicked course gets a soft halo so it reads at a glance among its neighbours.
        ...(code === root
          ? [
              `<rect x="${cardX - 5}" y="${y - 5}" width="${cardW + 10}" height="${CARD_H + 10}" rx="12" fill="${c.accent}" opacity="0.22"/>`,
            ]
          : []),
        `<rect x="${cardX}" y="${y}" width="${cardW}" height="${CARD_H}" rx="8" fill="${c.card}" ${stroke}/>`,
        `<rect x="${cardX}" y="${y + 6}" width="4" height="${CARD_H - 12}" rx="2" fill="${warning ? c.amber : AREAS[areaOf(code)][c.area]}"/>`,
        ...lines.map((line, row) =>
          text(cardX + 14, y + 20 + row * 15, line, 12, c.ink, 'font-weight="600"'),
        ),
        text(
          cardX + 14,
          metaY,
          course ? `${code} · ${course.hours} h` : code,
          10,
          warning ? c.amber : c.muted,
        ),
      );
      if (warning) {
        cards.push(
          text(cardX + cardW - 12, metaY, "!", 13, c.amber, 'font-weight="700" text-anchor="end"'),
        );
      }
      cards.push("</g>");
    }
  });

  const path = (route: Route, index: number) => {
    const sign = route.side === "left" ? -1 : 1;
    const edgeX = route.side === "left" ? cardX : cardX + cardW;
    const x = laneX(route);
    const y1 = ports.get(`${index}:from`)!;
    const y2 = ports.get(`${index}:to`)!;
    const inner = x - sign * RADIUS;
    return [
      `M${edgeX} ${y1}`,
      `H${inner}`,
      `Q${x} ${y1} ${x} ${y1 + RADIUS}`,
      `V${y2 - RADIUS}`,
      `Q${x} ${y2} ${inner} ${y2}`,
      `H${edgeX + sign * 2}`,
    ].join(" ");
  };
  const draw = (edge: KindEdge, d: string) => {
    const ends = `data-from="${edge.from}" data-to="${edge.to}"`;
    const dash = edge.kind === "approved" ? ` stroke-dasharray="${DASH}"` : "";
    if (focus === undefined) {
      const growing = animate
        ? `${edge.kind === "regular" ? ' pathLength="1"' : ""}${delay(EDGE_DELAY + columnOf.get(edge.to)! * STAGGER)}`
        : "";
      return `<path class="edge-${edge.kind}" ${ends} d="${d}" fill="none" stroke="${c.edge}" stroke-width="1.5"${dash}${growing} marker-end="url(#arrow)"/>`;
    }
    return touchesFocus(edge)
      ? `<path class="edge-${edge.kind} focused" ${ends} d="${d}" fill="none" stroke="${c.ink}" stroke-width="2.25"${dash} marker-end="url(#arrow-focus)"/>`
      : `<path class="edge-${edge.kind}" ${ends} d="${d}" fill="none" stroke="${c.edge}" stroke-width="1.5" opacity="0.15"${dash} marker-end="url(#arrow)"/>`;
  };
  const arrows = routes.map((route, index) => draw(route.edge, path(route, index)));
  // The implied arrows of the focus ride the right margin, past every lane of the drawing.
  extra.forEach((edge, index) => {
    const x = panelX + panelW + LANE_MARGIN - 2 + (lanesOn("right") + index) * LANE_STEP;
    const edgeX = cardX + cardW;
    const y1 = middle(edge.from);
    const y2 = middle(edge.to);
    const d = `M${edgeX} ${y1} H${x - RADIUS} Q${x} ${y1} ${x} ${y1 + RADIUS} V${y2 - RADIUS} Q${x} ${y2} ${x - RADIUS} ${y2} H${edgeX + 2}`;
    arrows.push(draw(edge as KindEdge, d));
  });
  if (focus !== undefined) {
    arrows.sort((a, b) => Number(a.includes(" focused")) - Number(b.includes(" focused")));
  }

  // Key: lines and colours, under the last cuatrimestre.
  const legend = [
    ...(hasKind("regular")
      ? [{ kind: "regular" as const, label: "Requiere la cursada aprobada" }]
      : []),
    ...(hasKind("approved")
      ? [{ kind: "approved" as const, label: "Requiere el final aprobado" }]
      : []),
    ...(warned.size > 0
      ? [{ kind: "warning" as const, label: "No cumple correlatividades o cuatrimestre" }]
      : []),
  ];
  const areas = (Object.keys(AREAS) as Area[]).filter((area) =>
    [...columnOf.keys()].some((code) => areaOf(code) === area),
  );
  const areaRows: { area: Area; x: number }[][] = [];
  let at = Infinity;
  for (const area of areas) {
    const swatchW = 12 + AREAS[area].label.length * KEY_CHAR_W + 16;
    if (at + swatchW > width - PAD) {
      areaRows.push([]);
      at = PAD;
    }
    areaRows.at(-1)!.push({ area, x: at });
    at += swatchW;
  }
  const keyRows = legend.length + areaRows.length;
  const keyTop = sectionsBottom + 24;
  const height = keyRows > 0 ? keyTop + 8 + keyRows * LEGEND_ROW_H + PAD : sectionsBottom + PAD;

  const key: string[] = [];
  if (keyRows > 0) {
    const rowY = (row: number) => keyTop + 8 + (row + 1) * LEGEND_ROW_H - 6;
    key.push(text(PAD, keyTop, "Referencias", 11, c.ink, 'font-weight="600"'));
    legend.forEach((entry, index) => {
      const y = rowY(index);
      if (entry.kind === "warning") {
        key.push(text(PAD + 17, y, "!", 13, c.amber, 'font-weight="700" text-anchor="middle"'));
      } else {
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

  const marker = (id: string, fill: string, size: number) =>
    `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="${size}" markerHeight="${size}" orient="auto">` +
    `<path d="M0 0L10 5L0 10z" fill="${fill}"/></marker>`;
  const defs = `<defs>${marker("arrow", c.edge, 7)}${focus === undefined ? "" : marker("arrow-focus", c.ink, 5)}</defs>`;
  const head = [
    `<rect width="${width}" height="${height}" fill="${c.page}"/>`,
    ...heading.map((line, index) =>
      text(PAD, headingY(index), line, 19, c.ink, 'font-weight="700"'),
    ),
    ...subtitle.map((line, index) => text(PAD, subtitleY(index), line, 12, c.muted)),
  ];
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(title ?? plan.name)}">` +
    [defs, ...(animate ? [BUILD_UP] : []), ...head, ...columns, ...arrows, ...cards, ...key].join(
      "",
    ) +
    `</svg>`;
  return { svg, width, height, cards: boxes };
}
