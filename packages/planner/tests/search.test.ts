import { describe, expect, test } from "vite-plus/test";
import { CURRICULUM } from "../src/curriculum.ts";
import { searchCourses } from "../src/search.ts";
import { SYLLABUS } from "../src/syllabus.ts";

const top = (query: string, count = 1) => searchCourses(query, CURRICULUM).slice(0, count);

describe("syllabus data", () => {
  test("covers every course except the optativas, which the plan does not describe", () => {
    const missing = CURRICULUM.filter((entry) => !SYLLABUS[entry.code]).map((entry) => entry.code);
    expect(missing.toSorted()).toEqual(["V1372", "V1378"]);
  });
});

describe("searchCourses", () => {
  test("returns every course in plan order for an empty query", () => {
    expect(searchCourses("  ", CURRICULUM)).toEqual(CURRICULUM.map((entry) => entry.code));
  });

  test("returns nothing when nothing relates to the query", () => {
    expect(searchCourses("xqzvwk", CURRICULUM)).toEqual([]);
  });

  test("finds by name regardless of accents and case", () => {
    expect(top("programacion concurrente")).toEqual(["V1374"]);
    expect(top("PROGRAMACIÓN CONCURRENTE")).toEqual(["V1374"]);
  });

  test("matches partially typed words", () => {
    expect(top("concurr")).toEqual(["V1374"]);
  });

  test("finds by topic mentioned only in the contents", () => {
    expect(top("telefonia ip")).toEqual(["V1294"]);
    expect(top("cadena de custodia")).toEqual(["V1377"]);
  });

  test("understands related concepts, not only the literal words", () => {
    expect(top("ia")).toEqual(["V1373"]);
    expect(top("machine learning")).toEqual(["V1373"]);
    expect(top("nube")).toEqual(["V1371"]);
    expect(top("testing")).toEqual(["V1248"]);
    expect(top("seguridad")).toEqual(["V1249"]);
    expect(top("web")).toEqual(["V1375"]);
  });

  test("ranks the database courses first for a database query", () => {
    expect(top("base de datos", 3).toSorted()).toEqual(["V1286", "V1290", "V1297"]);
  });

  test("does not pad the results with courses that only share a generic word", () => {
    const results = searchCourses("inteligencia artificial", CURRICULUM);
    expect(results[0]).toBe("V1373");
    expect(results).not.toContain("L0003");
    expect(results).not.toContain("V1289");
  });
});
