import type { Course, StudyPlan } from "planner";
import { buildPlanGraph } from "./planGraph.ts";
import type { GraphOptions, PlanGraph } from "./planGraph.ts";
import { buildVerticalGraph } from "./verticalGraph.ts";

/** `wide` puts the cuatrimestres side by side; `tall` stacks them, for a screen too narrow for that. */
export type GraphLayout = "wide" | "tall";

/** The plan's graph in the layout asked for; `rows` only matters to the wide one. */
export function buildGraph(
  plan: StudyPlan,
  curriculum: readonly Course[],
  { layout = "wide", ...options }: GraphOptions & { layout?: GraphLayout } = {},
): PlanGraph {
  return layout === "tall"
    ? buildVerticalGraph(plan, curriculum, options)
    : buildPlanGraph(plan, curriculum, options);
}
