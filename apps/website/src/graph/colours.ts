import type { CourseCode } from "planner";
import type { Edge } from "./arrange.ts";
import type { GraphTheme } from "./planGraph.ts";

/** Arrow colours, one per course that has arrows, in a light and a dark variant. */
const HUES: { light: string; dark: string }[] = [
  { light: "#dc2626", dark: "#f87171" },
  { light: "#2563eb", dark: "#60a5fa" },
  { light: "#d97706", dark: "#fbbf24" },
  { light: "#059669", dark: "#34d399" },
  { light: "#db2777", dark: "#f472b6" },
  { light: "#7c3aed", dark: "#a78bfa" },
  { light: "#0891b2", dark: "#22d3ee" },
  { light: "#65a30d", dark: "#a3e635" },
  { light: "#c2410c", dark: "#fb923c" },
  { light: "#4f46e5", dark: "#818cf8" },
  { light: "#0d9488", dark: "#2dd4bf" },
  { light: "#a21caf", dark: "#e879f9" },
];

/**
 * One colour for each course that has arrows leaving it, handed out in drawing `order`, so all the
 * arrows of a course can be followed across the picture.
 */
export function arrowColours(
  order: Iterable<CourseCode>,
  edges: readonly Edge[],
  theme: GraphTheme,
): Map<CourseCode, string> {
  const sources = new Set(edges.map((edge) => edge.from));
  const colours = new Map<CourseCode, string>();
  for (const code of order) {
    if (sources.has(code) && !colours.has(code)) {
      colours.set(code, HUES[colours.size % HUES.length]![theme]);
    }
  }
  return colours;
}

/**
 * Arrow heads, one per colour and size, since a marker cannot take the colour of its line in
 * every renderer. `id` names one; `defs` draws every one asked for so far.
 */
export function arrowHeads() {
  const heads = new Map<string, string>();
  return {
    id(colour: string, size = 7): string {
      const key = `${colour}/${size}`;
      if (!heads.has(key)) heads.set(key, `arrow-${heads.size}`);
      return heads.get(key)!;
    },
    defs(): string {
      return [...heads]
        .map(([key, id]) => {
          const [colour, size] = key.split("/");
          return (
            `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="${size}" markerHeight="${size}" orient="auto">` +
            `<path d="M0 0L10 5L0 10z" fill="${colour}"/></marker>`
          );
        })
        .join("");
    },
  };
}
