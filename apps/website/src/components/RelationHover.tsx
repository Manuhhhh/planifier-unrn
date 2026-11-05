import { AnimatePresence, motion } from "motion/react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { CURRICULUM, planProblems, slotCourses } from "planner";
import type { CourseCode, StudyPlan } from "planner";
import { LEGEND_H, NODE_H, NODE_W, edgePath, layoutDiagram } from "../diagram/layout.ts";
import { Check, Warning } from "./icons.tsx";
import { placeDiagram } from "../diagram/placement.ts";
import type { Placed } from "../diagram/layout.ts";
import { svgDataUrl } from "../graph/exportImage.ts";
import { buildMapGraph } from "../graph/mapGraph.ts";
import { useDarkMode } from "../hooks/useDarkMode.ts";
import { ordinal, slotLabel } from "../labels.ts";

interface Hovered {
  /** A course shows what it needs and enables; a cuatrimestre, the same for all its courses. */
  what: { code: CourseCode } | { slot: number };
  rect: DOMRect;
  /** The plan it was shown for; the diagram is hidden as soon as the plan changes. */
  plan: StudyPlan;
}

interface HoverControls {
  show: (code: CourseCode, element: Element) => void;
  showTerm: (slot: number, element: Element) => void;
  hide: () => void;
}

const HoverContext = createContext<HoverControls | null>(null);

type NodeState = "free" | "warning" | "placed";

/** Colors by what the course is in the plan; only the diagram's own course keeps a red highlight. */
const NODE_STYLES: Record<NodeState, string> = {
  free: "border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-900",
  warning:
    "border-amber-600 bg-amber-100 text-amber-800 dark:border-amber-400 dark:bg-amber-950 dark:text-amber-300",
  placed:
    "border-green-700 bg-green-100 text-green-800 dark:border-green-500 dark:bg-green-950 dark:text-green-300",
};
const FOCUSED_FREE = "border-red-700 bg-red-100 dark:border-red-400 dark:bg-red-950";

/** Left margin of the diagram, shared with the key so it lines up with the first column. */
const PAD_X = 12;

const nameOf = new Map(CURRICULUM.map((course) => [course.code, course.name]));

/** Shows, next to any course that asks for it, what it needs and what it enables. */
export function HoverProvider({ plan, children }: { plan: StudyPlan; children: ReactNode }) {
  const [hovered, setHovered] = useState<Hovered | null>(null);

  useEffect(() => {
    const hide = () => setHovered(null);
    window.addEventListener("scroll", hide, true);
    return () => window.removeEventListener("scroll", hide, true);
  }, []);

  const controls: HoverControls = {
    show: (code, element) =>
      setHovered({ what: { code }, rect: element.getBoundingClientRect(), plan }),
    showTerm: (slot, element) =>
      setHovered({ what: { slot }, rect: element.getBoundingClientRect(), plan }),
    hide: () => setHovered(null),
  };

  return (
    <HoverContext.Provider value={controls}>
      {children}
      <AnimatePresence>
        {hovered &&
          hovered.plan === plan &&
          ("code" in hovered.what ? (
            <Popover key={hovered.what.code} hovered={hovered} code={hovered.what.code} />
          ) : (
            <TermPopover
              key={`term-${hovered.what.slot}`}
              hovered={hovered}
              slot={hovered.what.slot}
            />
          ))}
      </AnimatePresence>
    </HoverContext.Provider>
  );
}

/** Props that make an element show the diagram of `code` on hover or keyboard focus. */
export function useCourseHover(code: CourseCode) {
  const controls = useContext(HoverContext);
  if (!controls) throw new Error("useCourseHover needs a HoverProvider");

  return {
    "data-code": code,
    onPointerEnter: (event: React.PointerEvent<Element>) => {
      if (event.pointerType !== "touch") controls.show(code, event.currentTarget);
    },
    onPointerLeave: controls.hide,
    // Only the keyboard: a tap focuses a button too, and the diagram would cover what was tapped.
    onFocus: (event: React.FocusEvent<Element>) => {
      if (event.target.matches(":focus-visible")) controls.show(code, event.currentTarget);
    },
    onBlur: controls.hide,
  };
}

/**
 * Props that make an element show, on hover or keyboard focus, the map of a cuatrimestre: its
 * courses, the ones they need and the ones planned after them that need them.
 */
export function useTermHover(slot: number) {
  const controls = useContext(HoverContext);
  if (!controls) throw new Error("useTermHover needs a HoverProvider");

  return {
    onPointerEnter: (event: React.PointerEvent<Element>) => {
      if (event.pointerType !== "touch") controls.showTerm(slot, event.currentTarget);
    },
    onPointerLeave: controls.hide,
    onFocus: (event: React.FocusEvent<Element>) => {
      if (event.target.matches(":focus-visible")) controls.showTerm(slot, event.currentTarget);
    },
    onBlur: controls.hide,
  };
}

/** Share of the window the map of a cuatrimestre may take, so it never hides the whole plan. */
const TERM_MAX_W = 0.9;
const TERM_MAX_H = 0.7;

function TermPopover({ hovered, slot }: { hovered: Hovered; slot: number }) {
  const { rect, plan } = hovered;
  const theme = useDarkMode() ? "dark" : "light";
  const graph = useMemo(
    () =>
      buildMapGraph(plan, CURRICULUM, {
        about: new Set(slotCourses(plan, slot)),
        title: slotLabel(plan, slot),
        theme,
        // The preview is drawn small: closer together and with larger text, so it stays legible.
        compact: true,
      }),
    [plan, slot, theme],
  );
  const scale = Math.min(
    1,
    (window.innerWidth * TERM_MAX_W) / graph.width,
    (window.innerHeight * TERM_MAX_H) / graph.height,
  );
  const size = { width: graph.width * scale, height: graph.height * scale };
  const { left, top } = placeDiagram(
    rect,
    { width: size.width + 2, height: size.height + 2 },
    { width: window.innerWidth, height: window.innerHeight },
  );

  return (
    <motion.div
      role="tooltip"
      data-testid="term-map"
      className="pointer-events-none fixed z-10 overflow-hidden rounded-[10px] border border-stone-200 shadow-xl dark:border-stone-700"
      style={{ left, top }}
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.08 } }}
      transition={{ duration: 0.15 }}
    >
      {/* An <img> never runs anything inside the SVG, so plan names can't inject markup. */}
      <img
        src={svgDataUrl(graph.svg)}
        alt={`Correlativas de ${slotLabel(plan, slot)}`}
        width={size.width}
        height={size.height}
        className="block"
      />
    </motion.div>
  );
}

function Popover({ hovered, code }: { hovered: Hovered; code: CourseCode }) {
  const { rect, plan } = hovered;
  const { width, height } = layoutDiagram(code, CURRICULUM);
  // The popover has a 1px border on every side, so it is 2px larger than the diagram it holds.
  const { left, top } = placeDiagram(
    rect,
    { width: width + 2, height: height + 2 },
    { width: window.innerWidth, height: window.innerHeight },
  );

  return (
    <motion.div
      role="tooltip"
      data-testid="relations"
      className="pointer-events-none fixed z-10 rounded-[10px] border border-stone-200 bg-white shadow-xl dark:border-stone-700 dark:bg-stone-800"
      style={{ left, top }}
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.08 } }}
      transition={{ duration: 0.15 }}
    >
      <RelationDiagram code={code} plan={plan} />
    </motion.div>
  );
}

const LEGEND_LABELS = { regular: "Cursada aprobada", approved: "Final aprobado" } as const;

/** Solid arrows mean "cursada aprobada", dashed ones "final aprobado"; a short key says so. */
export function RelationDiagram({ code, plan }: { code: CourseCode; plan: StudyPlan }) {
  const { width, height, left, right, center, legend, legendY } = layoutDiagram(code, CURRICULUM);
  const course = CURRICULUM.find((entry) => entry.code === code)!;
  const edges = [
    ...left.map((node) => ({ node, d: edgePath(node, center) })),
    ...right.map((node) => ({ node, d: edgePath(center, node) })),
  ];

  const planned = new Set([...plan.approved, ...plan.terms.flat()]);
  const warned = new Set(planProblems(plan, CURRICULUM).map((entry) => entry.code));
  const stateOf = (code: CourseCode): NodeState =>
    !planned.has(code) ? "free" : warned.has(code) ? "warning" : "placed";

  const node = (placed: Placed, order: number, focused = false) => {
    const state = stateOf(placed.code);
    return (
      <motion.div
        key={placed.code}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: order * 0.04, type: "spring", stiffness: 500, damping: 26 }}
        data-state={state}
        className={`absolute overflow-hidden text-ellipsis whitespace-nowrap rounded-md border px-2 text-[0.8rem] leading-[26px] ${
          focused && state === "free" ? FOCUSED_FREE : NODE_STYLES[state]
        } ${focused ? "font-semibold" : ""}`}
        style={{ left: placed.x, top: placed.y, width: NODE_W, height: NODE_H }}
      >
        {state === "placed" && <Check className="mr-1" />}
        {state === "warning" && <Warning className="mr-1" />}
        {nameOf.get(placed.code)}
      </motion.div>
    );
  };

  const caption = (text: string, x: number) => (
    <span
      key={text}
      className="absolute top-1.5 text-[0.7rem] uppercase tracking-wide text-stone-500 dark:text-stone-400"
      style={{ left: x }}
    >
      {text}
    </span>
  );

  return (
    <div className="relative" style={{ width, height }}>
      <svg className="absolute inset-0" width={width} height={height}>
        <defs>
          <marker
            id="relation-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M0 0 L10 5 L0 10 z" className="fill-red-700 dark:fill-red-400" />
          </marker>
        </defs>
        {edges.map(({ node: target, d }, index) => (
          <motion.path
            key={`${target.code}-${d}`}
            d={d}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 + index * 0.04, duration: 0.25 }}
            fill="none"
            strokeWidth={1.5}
            strokeDasharray={target.kind === "approved" ? "5 4" : undefined}
            markerEnd="url(#relation-arrow)"
            className="stroke-red-700 dark:stroke-red-400"
          />
        ))}
      </svg>
      {left.length > 0 && caption("Necesita", left[0]!.x)}
      {right.length > 0 && caption("Habilita", right[0]!.x)}
      {[...left, ...right].map((placed, index) => node(placed, index + 1))}
      {node(center, 0, true)}
      {course.plannedAfterYear !== undefined && (
        <span
          className="absolute text-[0.7rem] text-stone-500 dark:text-stone-400"
          style={{ left: center.x, top: center.y + NODE_H + 4 }}
        >
          Se cursa tras aprobar hasta {ordinal(course.plannedAfterYear)} año
        </span>
      )}
      {legend.length > 0 && (
        <div
          className="absolute flex items-center gap-4 text-[0.7rem] text-stone-500 dark:text-stone-400"
          style={{ left: PAD_X, top: legendY, height: LEGEND_H }}
        >
          {legend.map((kind) => (
            <span key={kind} className="flex items-center gap-1.5">
              <svg aria-hidden="true" width="22" height="8" className="shrink-0">
                <line
                  x1="0"
                  y1="4"
                  x2="22"
                  y2="4"
                  strokeWidth={1.5}
                  strokeDasharray={kind === "approved" ? "5 4" : undefined}
                  className="stroke-red-700 dark:stroke-red-400"
                />
              </svg>
              {LEGEND_LABELS[kind]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
