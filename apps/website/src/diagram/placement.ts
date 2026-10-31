export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const MARGIN = 16;

const overlaps = (a: Rect, b: Rect) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

/**
 * Where to float the diagram: fixed in the bottom-left corner. It only moves, to the
 * bottom-right and then to the top corners, when the course under the mouse sits right where it
 * would be drawn, so it never covers the course it describes.
 */
export function placeDiagram(
  target: Rect,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
): { left: number; top: number } {
  const right = Math.max(MARGIN, viewport.width - size.width - MARGIN);
  const bottom = Math.max(MARGIN, viewport.height - size.height - MARGIN);
  const candidates = [
    { left: MARGIN, top: bottom },
    { left: right, top: bottom },
    { left: MARGIN, top: MARGIN },
    { left: right, top: MARGIN },
  ];

  const free = (candidate: { left: number; top: number }) =>
    !overlaps(
      {
        left: candidate.left,
        top: candidate.top,
        right: candidate.left + size.width,
        bottom: candidate.top + size.height,
      },
      target,
    );

  return candidates.find(free) ?? candidates[0]!;
}
