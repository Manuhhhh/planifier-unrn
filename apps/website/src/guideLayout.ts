export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

const GAP = 12;
const MARGIN = 16;

/** Expands a target's rect into the spotlight hole drawn around it. */
export function spotlightFor(target: Rect, padding = 8): Rect {
  return {
    x: target.x - padding,
    y: target.y - padding,
    width: target.width + padding * 2,
    height: target.height + padding * 2,
  };
}

/**
 * Where to place the step card around the spotlight: below it when there is room, above it
 * otherwise, and failing both, wherever fits best — always clamped on screen with `MARGIN`.
 */
export function placeCard(spotlight: Rect, viewport: Size, card: Size): { x: number; y: number } {
  const below = spotlight.y + spotlight.height + GAP;
  const above = spotlight.y - GAP - card.height;
  const fitsBelow = below + card.height <= viewport.height - MARGIN;
  const fitsAbove = above >= MARGIN;

  const y = fitsBelow ? below : fitsAbove ? above : viewport.height - MARGIN - card.height;
  const clampedY = Math.max(MARGIN, Math.min(y, viewport.height - MARGIN - card.height));

  const centeredX = spotlight.x + spotlight.width / 2 - card.width / 2;
  const x = Math.max(MARGIN, Math.min(centeredX, viewport.width - MARGIN - card.width));

  return { x, y: clampedY };
}

/** Centered placement for a step with no target (an intro or an outro). */
export function placeCenteredCard(viewport: Size, card: Size): { x: number; y: number } {
  return { x: (viewport.width - card.width) / 2, y: (viewport.height - card.height) / 2 };
}
