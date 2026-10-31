import { expect, test } from "vite-plus/test";
import { placeDiagram } from "./placement.ts";
import type { Rect } from "./placement.ts";

const viewport = { width: 1440, height: 900 };
const size = { width: 640, height: 220 };
const rect = (left: number, top: number, width = 600, height = 40): Rect => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
});

const overlaps = (a: Rect, b: Rect) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
const boxOf = (position: { left: number; top: number }): Rect => ({
  left: position.left,
  top: position.top,
  right: position.left + size.width,
  bottom: position.top + size.height,
});

const BOTTOM_LEFT = { left: 16, top: 900 - 220 - 16 };

test("sits fixed in the bottom-left corner, wherever the course is", () => {
  expect(placeDiagram(rect(40, 300), size, viewport)).toEqual(BOTTOM_LEFT);
  expect(placeDiagram(rect(40, 100), size, viewport)).toEqual(BOTTOM_LEFT);
  expect(placeDiagram(rect(780, 100), size, viewport)).toEqual(BOTTOM_LEFT);
});

test("moves to the bottom-right corner when the course is in the bottom-left one", () => {
  const target = rect(40, 700);
  expect(placeDiagram(target, size, viewport)).toEqual({
    left: 1440 - 640 - 16,
    top: BOTTOM_LEFT.top,
  });
});

test("goes to the top when the course spans the whole bottom", () => {
  const target = rect(16, 700, 1408);
  const position = placeDiagram(target, size, viewport);
  expect(overlaps(boxOf(position), target)).toBe(false);
  expect(position.top).toBe(16);
});

test("never covers the hovered course, wherever it is", () => {
  for (const viewportWidth of [900, 1024, 1440, 1920]) {
    for (let left = 0; left < viewportWidth - 200; left += 97) {
      for (let top = 0; top < 860; top += 83) {
        const target = rect(left, top, 200, 40);
        const position = placeDiagram(target, size, { width: viewportWidth, height: 900 });
        expect(overlaps(boxOf(position), target), `${viewportWidth}: ${left},${top}`).toBe(false);
      }
    }
  }
});
