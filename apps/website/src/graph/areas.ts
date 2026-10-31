import type { CourseCode } from "planner";

export type Area = "programming" | "math" | "software" | "data" | "systems" | "general";

/** Display order of the key, with the colour of each area's bar on a light and a dark page. */
export const AREAS: Record<Area, { label: string; color: string; dark: string }> = {
  programming: { label: "Programación", color: "#1d4ed8", dark: "#60a5fa" },
  math: { label: "Matemática", color: "#7c3aed", dark: "#a78bfa" },
  software: { label: "Ingeniería de software", color: "#0f766e", dark: "#2dd4bf" },
  data: { label: "Bases de datos", color: "#be185d", dark: "#f472b6" },
  systems: { label: "Sistemas y redes", color: "#4d7c0f", dark: "#a3e635" },
  general: { label: "Formación general", color: "#57534e", dark: "#a8a29e" },
};

/** Grouping for the picture only; the plan of studies does not define areas. */
const AREA_OF: Record<CourseCode, Area> = {
  V1250: "programming",
  V1251: "programming",
  V1287: "programming",
  V1291: "programming",
  V1293: "programming",
  V1296: "programming",
  V1299: "programming",
  V1374: "programming",
  V1373: "programming",
  V1281: "math",
  V1285: "math",
  V1292: "math",
  V1298: "math",
  V1248: "math",
  V1282: "software",
  V1284: "software",
  V1289: "software",
  V1295: "software",
  V1223: "software",
  V1375: "software",
  V1376: "software",
  V1286: "data",
  V1290: "data",
  V1297: "data",
  V1283: "systems",
  V1288: "systems",
  V1294: "systems",
  V1370: "systems",
  V1371: "systems",
  V1249: "systems",
  V1377: "systems",
  V1280: "general",
  L0002: "general",
  L0003: "general",
  V1235: "general",
  V1372: "general",
  V1378: "general",
  V1379: "general",
};

export const hasArea = (code: CourseCode) => Object.hasOwn(AREA_OF, code);

export const areaOf = (code: CourseCode): Area => AREA_OF[code] ?? "general";
