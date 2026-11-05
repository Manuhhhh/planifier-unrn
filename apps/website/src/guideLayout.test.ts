import { expect, test } from "vite-plus/test";
import { placeCard, placeCenteredCard, spotlightFor } from "./guideLayout.ts";

test("the spotlight grows the target rect by the padding on every side", () => {
  const spotlight = spotlightFor({ x: 100, y: 50, width: 40, height: 20 }, 8);
  expect(spotlight).toEqual({ x: 92, y: 42, width: 56, height: 36 });
});

test("defaults the spotlight padding to 8", () => {
  expect(spotlightFor({ x: 10, y: 10, width: 10, height: 10 })).toEqual(
    spotlightFor({ x: 10, y: 10, width: 10, height: 10 }, 8),
  );
});

test("places the card below the spotlight when there is room", () => {
  const spotlight = { x: 100, y: 100, width: 80, height: 30 };
  const viewport = { width: 800, height: 600 };
  const card = { width: 200, height: 120 };
  const placed = placeCard(spotlight, viewport, card);
  expect(placed.y).toBe(142); // 100 + 30 + 12 gap
});

test("places the card above the spotlight when there is no room below", () => {
  const spotlight = { x: 100, y: 540, width: 80, height: 30 };
  const viewport = { width: 800, height: 600 };
  const card = { width: 200, height: 120 };
  const placed = placeCard(spotlight, viewport, card);
  expect(placed.y).toBe(540 - 12 - 120);
});

test("centers the card on the spotlight horizontally, clamped to stay fully on screen", () => {
  const viewport = { width: 800, height: 600 };
  const card = { width: 200, height: 100 };
  const centered = placeCard({ x: 380, y: 100, width: 40, height: 20 }, viewport, card);
  expect(centered.x).toBe(380 + 20 - 100);

  const nearLeftEdge = placeCard({ x: 0, y: 100, width: 20, height: 20 }, viewport, card);
  expect(nearLeftEdge.x).toBe(16);

  const nearRightEdge = placeCard({ x: 780, y: 100, width: 20, height: 20 }, viewport, card);
  expect(nearRightEdge.x).toBe(viewport.width - 16 - card.width);
});

test("never places the card off screen when there is no room above or below", () => {
  const spotlight = { x: 100, y: 0, width: 80, height: 600 };
  const viewport = { width: 800, height: 600 };
  const card = { width: 200, height: 500 };
  const placed = placeCard(spotlight, viewport, card);
  expect(placed.y).toBeGreaterThanOrEqual(16);
  expect(placed.y + card.height).toBeLessThanOrEqual(viewport.height - 16 + 0.001);
});

test("centers an unanchored step's card in the viewport", () => {
  const placed = placeCenteredCard({ width: 800, height: 600 }, { width: 200, height: 100 });
  expect(placed).toEqual({ x: 300, y: 250 });
});
