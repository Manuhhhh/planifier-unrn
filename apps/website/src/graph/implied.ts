import type { CourseCode } from "planner";
import type { Edge } from "./arrange.ts";

/**
 * Whether each arrow is implied by a chain of the others: A → C adds nothing when A → B and
 * B → C are there, since taking B already needs A. The arrows must not form a cycle (they always
 * go forward in time).
 */
export function impliedEdges(edges: readonly Edge[]): boolean[] {
  const next = new Map<CourseCode, CourseCode[]>();
  for (const { from, to } of edges) next.set(from, [...(next.get(from) ?? []), to]);

  // Reachable from `start` in one or more steps, without taking the direct step to `avoid`.
  const reachesAround = (start: CourseCode, avoid: CourseCode): boolean => {
    const seen = new Set<CourseCode>();
    const stack = (next.get(start) ?? []).filter((code) => code !== avoid);
    while (stack.length > 0) {
      const code = stack.pop()!;
      if (code === avoid) return true;
      if (seen.has(code)) continue;
      seen.add(code);
      stack.push(...(next.get(code) ?? []));
    }
    return false;
  };
  return edges.map(({ from, to }) => reachesAround(from, to));
}
