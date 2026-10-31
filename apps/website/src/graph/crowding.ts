import type { CourseCode } from "planner";
import { assignLanes } from "./lanes.ts";
import type { Arc } from "./lanes.ts";

/** An arrow that runs around a board: its lane geometry and the courses it joins. */
export interface Routed {
  arc: Arc;
  from: CourseCode;
  to: CourseCode;
}

export interface CrowdingLimit {
  /** Most lanes stacked on one side of a board. */
  lanes: number;
  /** Most arrows reaching or leaving one card on a board. */
  ends: number;
}

/**
 * Board of each arrow, splitting them over as few boards as needed so that none gets crowded
 * past `limit`. Longer arrows are placed first; each one goes on the first board where it still
 * fits, and opens a new board when it fits nowhere.
 */
export function splitCrowded(items: readonly Routed[], limit: CrowdingLimit): number[] {
  const span = (index: number) => items[index]!.arc.to - items[index]!.arc.from;
  const order = Array.from(items.keys());
  order.sort((a, b) => span(b) - span(a) || items[a]!.arc.from - items[b]!.arc.from);

  const fits = (members: readonly number[]) => {
    const lanes = assignLanes(members.map((index) => items[index]!.arc));
    if (Math.max(...lanes) + 1 > limit.lanes) return false;
    const ends = new Map<CourseCode, number>();
    for (const index of members) {
      for (const code of [items[index]!.from, items[index]!.to]) {
        ends.set(code, (ends.get(code) ?? 0) + 1);
      }
    }
    return Math.max(...ends.values()) <= limit.ends;
  };

  const boards: number[][] = [];
  const boardOf = items.map(() => 0);
  for (const index of order) {
    let board = boards.findIndex((members) => fits([...members, index]));
    if (board === -1) board = boards.push([]) - 1;
    boards[board]!.push(index);
    boardOf[index] = board;
  }
  return boardOf;
}
