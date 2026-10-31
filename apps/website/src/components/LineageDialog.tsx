import { motion } from "motion/react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CURRICULUM } from "planner";
import type { CourseCode, StudyPlan } from "planner";
import { AREAS, areaOf } from "../graph/areas.ts";
import { svgDataUrl } from "../graph/exportImage.ts";
import { buildPlanGraph, neighboursOf } from "../graph/planGraph.ts";
import type { CardBox, GraphRows, GraphTheme } from "../graph/planGraph.ts";
import { Close } from "./icons.tsx";

/** Where a card is on screen: top-left corner and how much it is scaled from its drawn size. */
export interface Place {
  x: number;
  y: number;
  scale: number;
}

const byCode = new Map(CURRICULUM.map((course) => [course.code, course]));
const materias = (count: number) => `${count} ${count === 1 ? "materia" : "materias"}`;
const fly = { type: "spring", stiffness: 170, damping: 24 } as const;
/** Room kept free around the centred graph, and the height of the heading above it. */
const MARGIN = 24;
const HEADING_H = 72;

/**
 * Takes over the screen to show one course's correlatives: everything else fades, the cards of the
 * courses one step away (the ones it needs and the ones that need it) fly out of the plan's
 * graph into a graph of their own, centred, whose columns and arrows then build up.
 * Closing sends them back. `from` is where each card sits in the plan's graph on screen.
 */
export function LineageDialog({
  plan,
  code,
  rows,
  theme,
  from,
  onClose,
}: {
  plan: StudyPlan;
  code: CourseCode;
  rows: GraphRows;
  theme: GraphTheme;
  from: (code: CourseCode) => Place | undefined;
  onClose: () => void;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const name = byCode.get(code)?.name ?? code;
  // The graph's columns and arrows appear once the cards have landed.
  const [landed, setLanded] = useState(false);

  const { lineage, graph } = useMemo(() => {
    const lineage = neighboursOf(plan, CURRICULUM, code);
    const only = new Set([code, ...lineage.needs, ...lineage.unlocks]);
    // The "Animaciones" preference lives on <html>; inside an <img> the SVG can't see it.
    const animate = document.documentElement.dataset.animations !== "off";
    const graph = buildPlanGraph(plan, CURRICULUM, {
      only,
      root: code,
      title: name,
      animate,
      rows,
      theme,
    });
    return { lineage, graph };
  }, [plan, code, name, rows, theme]);

  // Fit the graph in the window below the heading, never enlarged past its drawn size.
  const [fit] = useState(() => {
    const scale = Math.min(
      1,
      (window.innerWidth - 2 * MARGIN) / graph.width,
      (window.innerHeight - HEADING_H - 2 * MARGIN) / graph.height,
    );
    return {
      scale,
      x: (window.innerWidth - graph.width * scale) / 2,
      y: HEADING_H + (window.innerHeight - HEADING_H - graph.height * scale) / 2,
    };
  });

  // One flying card per course: the first time it is drawn (its first board).
  const flying = useMemo(() => {
    const seen = new Set<CourseCode>();
    return graph.cards.filter((card) => !seen.has(card.code) && seen.add(card.code));
  }, [graph]);
  const to = (card: CardBox): Place => ({
    x: fit.x + card.x * fit.scale,
    y: fit.y + card.y * fit.scale,
    scale: fit.scale,
  });

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  const alone = lineage.needs.size === 0 && lineage.unlocks.size === 0;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="fixed inset-0 z-50">
      <motion.div
        className="absolute inset-0 bg-stone-950/85 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        onMouseDown={onClose}
      />

      <motion.div
        className="absolute inset-x-0 top-0 flex items-start gap-3 px-6 py-4 text-white"
        style={{ height: HEADING_H }}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.25 }}
      >
        <div className="mr-auto">
          <h2 id={titleId} className="text-lg font-semibold">
            {name}
          </h2>
          <p className="text-sm text-stone-300">
            {alone
              ? "No tiene correlativas con otras materias del plan."
              : `Necesita ${materias(lineage.needs.size)} · Habilita ${materias(lineage.unlocks.size)}`}
          </p>
        </div>
        {/* Its own button: on the dark backdrop the usual muted icon button can't be seen. */}
        <button
          ref={closeRef}
          type="button"
          aria-label="Cerrar"
          onClick={onClose}
          className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/30"
        >
          <Close />
        </button>
      </motion.div>

      {/* An <img> never runs anything inside the SVG, so course names can't inject markup. */}
      {landed && (
        <motion.img
          src={svgDataUrl(graph.svg)}
          alt={`Correlativas de ${name}`}
          className="absolute max-w-none rounded-xl shadow-2xl"
          style={{
            left: fit.x,
            top: fit.y,
            width: graph.width * fit.scale,
            height: graph.height * fit.scale,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        />
      )}

      {flying.map((card, index) => (
        <FlyingCard
          key={card.code}
          card={card}
          root={card.code === code}
          theme={theme}
          from={from(card.code) ?? to(card)}
          to={to(card)}
          onLanded={index === 0 ? () => setLanded(true) : undefined}
        />
      ))}
    </div>
  );
}

/** HTML copy of a graph card that flies between the plan's graph and the chain's graph. */
function FlyingCard({
  card,
  root,
  theme,
  from,
  to,
  onLanded,
}: {
  card: CardBox;
  root: boolean;
  theme: GraphTheme;
  from: Place;
  to: Place;
  onLanded?: () => void;
}) {
  const course = byCode.get(card.code);
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 origin-top-left"
      style={{ width: card.width, height: card.height }}
      initial={{ ...from }}
      animate={{ ...to }}
      exit={{ ...from, transition: { ...fly, stiffness: 220 } }}
      transition={fly}
      // Also fires after flying back, when the graph is already shown: setting it again is a no-op.
      onAnimationComplete={() => onLanded?.()}
    >
      {/* Same colours as the graph's cards (its palettes in planGraph.ts), so the swap is seamless. */}
      <div
        className={`flex h-full gap-2.5 rounded-lg bg-white py-1.5 pl-1.5 pr-3 text-stone-900 shadow-lg dark:bg-[#2e2926] dark:text-stone-100 ${
          root
            ? "border-2 border-stone-900 dark:border-stone-100"
            : "border border-stone-200 dark:border-stone-700"
        }`}
      >
        <span
          className="w-1 shrink-0 rounded-full"
          style={{ background: AREAS[areaOf(card.code)][theme === "dark" ? "dark" : "color"] }}
        />
        <span className="min-w-0 pt-1">
          <span className="line-clamp-2 text-xs leading-[15px] font-semibold">{card.name}</span>
          <span className="block text-[10px] text-stone-500 dark:text-stone-400">
            {course ? `${card.code} · ${course.hours} h` : card.code}
          </span>
        </span>
      </div>
    </motion.div>
  );
}
