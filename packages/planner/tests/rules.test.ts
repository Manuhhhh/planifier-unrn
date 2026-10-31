import { describe, expect, test } from "vite-plus/test";
import { CURRICULUM } from "../src/curriculum.ts";
import { canEnroll, enrollBlockers } from "../src/rules.ts";
import type { Course, Progress } from "../src/types.ts";

const course = (code: string): Course => CURRICULUM.find((entry) => entry.code === code)!;

describe("canEnroll", () => {
  test("allows courses without correlatives", () => {
    expect(canEnroll(course("V1250"), {}, CURRICULUM)).toBe(true);
  });

  test("requires a regular (cursada aprobada) prerequisite", () => {
    expect(canEnroll(course("V1283"), {}, CURRICULUM)).toBe(false);
    expect(canEnroll(course("V1283"), { V1281: "regular" }, CURRICULUM)).toBe(true);
  });

  test("accepts an approved prerequisite where a regular one is required", () => {
    expect(canEnroll(course("V1283"), { V1281: "approved" }, CURRICULUM)).toBe(true);
  });

  test("requires every listed prerequisite", () => {
    const progress: Progress = { V1282: "regular" };
    expect(canEnroll(course("V1284"), progress, CURRICULUM)).toBe(false);
    expect(canEnroll(course("V1284"), { ...progress, V1280: "regular" }, CURRICULUM)).toBe(true);
  });

  test("requires an approved final where the plan asks for one", () => {
    const regularOnly: Progress = { V1287: "regular", V1251: "regular" };
    expect(canEnroll(course("V1293"), regularOnly, CURRICULUM)).toBe(false);
    expect(canEnroll(course("V1293"), { ...regularOnly, V1251: "approved" }, CURRICULUM)).toBe(
      true,
    );
  });

  test("rejects a course that is already regular or approved", () => {
    expect(canEnroll(course("V1250"), { V1250: "regular" }, CURRICULUM)).toBe(false);
    expect(canEnroll(course("V1250"), { V1250: "approved" }, CURRICULUM)).toBe(false);
  });

  test("keeps the supervised practice for after fourth year", () => {
    const years1to4 = CURRICULUM.filter((entry) => entry.year <= 4);
    const allApproved = Object.fromEntries(
      years1to4.map((entry) => [entry.code, "approved" as const]),
    );
    const missingOne = { ...allApproved, V1249: "regular" as const };

    expect(canEnroll(course("V1379"), {}, CURRICULUM)).toBe(false);
    expect(canEnroll(course("V1379"), missingOne, CURRICULUM)).toBe(false);
    expect(canEnroll(course("V1379"), allApproved, CURRICULUM)).toBe(true);
  });
});

describe("enrollBlockers", () => {
  test("lists every missing correlative with its kind", () => {
    expect(enrollBlockers(course("V1293"), {}, CURRICULUM)).toEqual([
      { kind: "regular", code: "V1287" },
      { kind: "approved", code: "V1251" },
    ]);
  });

  test("is empty once the correlatives are met", () => {
    expect(
      enrollBlockers(course("V1293"), { V1287: "regular", V1251: "approved" }, CURRICULUM),
    ).toEqual([]);
  });

  test("names the year the supervised practice waits for", () => {
    expect(enrollBlockers(course("V1379"), {}, CURRICULUM)).toEqual([{ kind: "year", year: 4 }]);
  });
});
