import type { Course, StudyPlan } from "planner";
import { buildMapGraph } from "./mapGraph.ts";
import { buildPlanGraph } from "./planGraph.ts";
import type { GraphOptions, PlanGraph } from "./planGraph.ts";
import { buildVerticalGraph } from "./verticalGraph.ts";

/** `wide` puts the cuatrimestres side by side; `tall` stacks them, for a screen too narrow for that. */
export type GraphLayout = "wide" | "tall";

/** `cards` shows each course as a card with its name; `map` as an oval with its code, by year. */
export type GraphStyle = "cards" | "map";

/**
 * The plan's graph in the style and layout asked for; `rows` only matters to the wide cards, and
 * the map has a single layout.
 */
export function buildGraph(
  plan: StudyPlan,
  curriculum: readonly Course[],
  {
    layout = "wide",
    style = "cards",
    ...options
  }: GraphOptions & { layout?: GraphLayout; style?: GraphStyle } = {},
): PlanGraph {
  if (style === "map") return buildMapGraph(plan, curriculum, options);
  return layout === "tall"
    ? buildVerticalGraph(plan, curriculum, options)
    : buildPlanGraph(plan, curriculum, options);
}
