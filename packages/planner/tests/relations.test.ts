import { describe, expect, test } from "vite-plus/test";
import { CURRICULUM } from "../src/curriculum.ts";
import { relationsOf } from "../src/relations.ts";

describe("relationsOf", () => {
  test("lists what a course needs, with the kind of requirement", () => {
    expect(relationsOf("V1293", CURRICULUM).requires).toEqual([
      { code: "V1287", kind: "regular" },
      { code: "V1251", kind: "approved" },
    ]);
  });

  test("lists what a course enables, from the dependent's point of view", () => {
    const { enables } = relationsOf("V1291", CURRICULUM);
    expect(enables.map((relation) => relation.code).toSorted()).toEqual(
      ["V1223", "V1249", "V1295", "V1296", "V1297", "V1299", "V1371"].toSorted(),
    );
    expect(enables.find((relation) => relation.code === "V1299")?.kind).toBe("approved");
    expect(enables.find((relation) => relation.code === "V1295")?.kind).toBe("regular");
  });

  test("is empty at both ends for a course with no correlatives and no dependents", () => {
    expect(relationsOf("V1379", CURRICULUM)).toEqual({ requires: [], enables: [] });
  });

  test("is consistent: if A enables B then B requires A", () => {
    for (const { code } of CURRICULUM) {
      for (const { code: other, kind } of relationsOf(code, CURRICULUM).enables) {
        expect(relationsOf(other, CURRICULUM).requires).toContainEqual({ code, kind });
      }
    }
  });
});
