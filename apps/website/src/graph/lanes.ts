export interface Arc {
  /** Column the arc leaves from and the one it arrives at. */
  from: number;
  to: number;
  /** Which side of the board it runs on. */
  side: "up" | "down";
}

/**
 * Lane of each arc, 0 being the closest to the board. An arc is always farther out than every
 * shorter arc it shares columns with, so the more cuatrimestres it skips the farther out it
 * runs; arcs that share no columns reuse the same lane.
 */
export function assignLanes(arcs: readonly Arc[]): number[] {
  const lanes: number[] = Array.from({ length: arcs.length }, () => 0);
  const placed: number[] = [];
  const byLength = Array.from(arcs.keys());
  byLength.sort(
    (a, b) =>
      arcs[a]!.to - arcs[a]!.from - (arcs[b]!.to - arcs[b]!.from) || arcs[a]!.from - arcs[b]!.from,
  );

  for (const index of byLength) {
    const arc = arcs[index]!;
    let lane = 0;
    for (const other of placed) {
      const rival = arcs[other]!;
      if (rival.side === arc.side && rival.from < arc.to && arc.from < rival.to) {
        lane = Math.max(lane, lanes[other]! + 1);
      }
    }
    lanes[index] = lane;
    placed.push(index);
  }
  return lanes;
}
