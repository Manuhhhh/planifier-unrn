import { expect, test } from "vite-plus/test";
import { defaultPreferences, parsePreferences } from "./preferences.ts";

test("defaults to the system theme with animations on", () => {
  expect(defaultPreferences).toEqual({ theme: "system", animations: true });
});

test("keeps valid saved values", () => {
  expect(parsePreferences({ theme: "dark", animations: false })).toEqual({
    theme: "dark",
    animations: false,
  });
});

test("falls back field by field when a value is invalid", () => {
  expect(parsePreferences({ theme: "sepia", animations: false })).toEqual({
    theme: "system",
    animations: false,
  });
  expect(parsePreferences({ theme: "light", animations: "no" })).toEqual({
    theme: "light",
    animations: true,
  });
});

test("ignores anything that is not an object", () => {
  for (const raw of [null, undefined, 42, "dark", []]) {
    expect(parsePreferences(raw)).toEqual(defaultPreferences);
  }
});
