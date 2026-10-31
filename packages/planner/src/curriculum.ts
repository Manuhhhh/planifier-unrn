import type { Correlatives, Course, CourseCode, Term, Year } from "./types.ts";

/**
 * Licenciatura en Sistemas, Plan 2022 (UNRN, Sede Atlántica).
 * Hours and cuatrimestres: Plan de Estudios (Res. CSDEyVE 015/22).
 * Correlatives: "Mapa de correlatividades" of the same resolution.
 */

interface Requirements {
  /** Cursada aprobada needed to enroll. */
  regular?: CourseCode[];
  /** Final approved needed to enroll. */
  approved?: CourseCode[];
  /** Final approved needed to sit the final. */
  final?: CourseCode[];
}

const toCorrelatives = ({
  regular = [],
  approved = [],
  final = [],
}: Requirements): Correlatives => ({
  enrollRegular: regular,
  enrollApproved: approved,
  finalApproved: final,
});

function course(
  code: CourseCode,
  name: string,
  year: Year,
  term: Term,
  weeklyHours: number,
  hours: number,
  requirements: Requirements = {},
): Course {
  return {
    code,
    name,
    year,
    terms: [term],
    weeklyHours,
    hours,
    correlatives: toCorrelatives(requirements),
  };
}

export const CURRICULUM: readonly Course[] = [
  // Year 1
  course("V1280", "Lenguaje, Interpretación y Escritura Académica", 1, 1, 5, 80),
  course("V1250", "Programación de Computadoras I", 1, 1, 6, 96),
  course("V1281", "Matemática I", 1, 1, 4, 64),
  course("V1282", "Introducción a los Sistemas de Información", 1, 1, 4, 64),
  course("V1283", "Organización y Arquitectura de Computadoras", 1, 2, 6, 96, {
    regular: ["V1281"],
    final: ["V1281"],
  }),
  course("V1284", "Introducción a la Ingeniería de Software", 1, 2, 4, 64, {
    regular: ["V1282", "V1280"],
    final: ["V1282", "V1280"],
  }),
  course("V1251", "Programación de Computadoras II", 1, 2, 6, 96, {
    regular: ["V1250"],
    final: ["V1250"],
  }),
  course("V1285", "Matemática II", 1, 2, 4, 64, { regular: ["V1281"], final: ["V1281"] }),

  // Year 2
  course("V1286", "Introducción a las Bases de Datos", 2, 1, 6, 96, {
    regular: ["V1251"],
    final: ["V1251"],
  }),
  course("V1287", "Orientación a Objetos I", 2, 1, 5, 80, {
    regular: ["V1284", "V1251"],
    final: ["V1284", "V1251"],
  }),
  course("V1288", "Introducción a los Sistemas Operativos", 2, 1, 5, 80, {
    regular: ["V1283"],
    final: ["V1283"],
  }),
  course("V1289", "Sistemas y Organizaciones", 2, 1, 5, 80, {
    regular: ["V1284"],
    final: ["V1284"],
  }),
  course("V1290", "Bases de Datos I", 2, 2, 6, 96, { regular: ["V1286"], final: ["V1286"] }),
  course("V1291", "Seminario de Lenguajes", 2, 2, 4, 64, { regular: ["V1287"], final: ["V1287"] }),
  course("L0002", "Inglés Integral I", 2, 2, 4, 64),
  course("V1292", "Matemática III", 2, 2, 6, 96, { regular: ["V1285"], final: ["V1285"] }),

  // Year 3
  course("V1293", "Orientación a Objetos II", 3, 1, 5, 80, {
    regular: ["V1287"],
    approved: ["V1251"],
    final: ["V1287"],
  }),
  course("V1294", "Redes y Comunicaciones", 3, 1, 5, 80, {
    regular: ["V1288"],
    approved: ["V1283"],
    final: ["V1288"],
  }),
  course("V1295", "Ingeniería de Software", 3, 1, 5, 80, {
    regular: ["V1291"],
    approved: ["V1284"],
    final: ["V1291"],
  }),
  course("L0003", "Inglés Integral II", 3, 1, 4, 64, { regular: ["L0002"], final: ["L0002"] }),
  course("V1296", "Algoritmos y Estructuras de Datos", 3, 2, 5, 80, {
    regular: ["V1291", "V1292"],
    approved: ["V1251"],
    final: ["V1291", "V1292"],
  }),
  course("V1223", "Proyecto de Software", 3, 2, 6, 96, {
    regular: ["V1290", "V1291"],
    approved: ["V1287"],
    final: ["V1290", "V1291"],
  }),
  course("V1297", "Bases de Datos II", 3, 2, 6, 96, {
    regular: ["V1290", "V1291"],
    approved: ["V1286"],
    final: ["V1290", "V1291"],
  }),
  course("V1298", "Matemática IV", 3, 2, 6, 96, {
    regular: ["V1292"],
    approved: ["V1285"],
    final: ["V1292"],
  }),

  // Year 4
  course("V1299", "Conceptos y Paradigmas de Lenguajes de Programación", 4, 1, 5, 80, {
    regular: ["V1296", "V1223"],
    approved: ["V1291"],
    final: ["V1296", "V1223"],
  }),
  course("V1374", "Programación Concurrente", 4, 1, 4, 64, {
    regular: ["V1294", "V1288"],
    final: ["V1294", "V1288"],
  }),
  course("V1371", "Cloud Computing", 4, 1, 5, 80, {
    regular: ["V1294", "V1223", "V1297"],
    approved: ["V1290", "V1291"],
    final: ["V1294", "V1223", "V1297"],
  }),
  course("V1372", "Optativa I", 4, 2, 5, 80, {
    regular: ["V1294", "V1296", "V1223"],
    approved: ["V1293"],
    final: ["V1294", "V1296", "V1223"],
  }),
  course("V1373", "Técnicas, Entornos y Aplicaciones de Inteligencia Artificial", 4, 2, 6, 96, {
    regular: ["V1223", "V1298"],
    approved: ["V1296"],
    final: ["V1223", "V1298"],
  }),
  course("V1370", "Sistemas Operativos", 4, 2, 5, 80, { regular: ["V1374"], final: ["V1374"] }),
  course("V1249", "Auditoría y Seguridad de la Información", 4, 2, 5, 80, {
    regular: ["V1294", "V1223"],
    approved: ["V1290", "V1291"],
    final: ["V1294", "V1223"],
  }),

  // Year 5
  course("V1235", "Aspectos Legales, Profesionales y Sociales de la Informática", 5, 1, 5, 80, {
    regular: ["V1249"],
    final: ["V1249"],
  }),
  course("V1378", "Optativa II", 5, 1, 5, 80, { regular: ["V1372"], final: ["V1372"] }),
  course("V1377", "Forensia Informática", 5, 1, 4, 64, {
    regular: ["V1370", "V1249"],
    approved: ["V1288"],
    final: ["V1370", "V1249"],
  }),
  course("V1375", "Taller de Tecnologías y Producción de Software", 5, 2, 6, 96, {
    regular: ["V1371", "V1249", "V1378"],
    approved: ["V1223"],
    final: ["V1371", "V1249", "V1378"],
  }),
  course("V1376", "Gestión de Proyectos", 5, 2, 5, 80, {
    regular: ["V1371", "V1378"],
    approved: ["V1295"],
    final: ["V1371", "V1378"],
  }),
  course("V1248", "Verificación de Programas y Computabilidad", 5, 2, 6, 96, {
    regular: ["V1249", "V1378"],
    approved: ["V1223"],
    final: ["V1249", "V1378"],
  }),
  {
    code: "V1379",
    name: "Práctica Profesional Supervisada",
    year: 5,
    terms: [1, 2],
    weeklyHours: null,
    hours: 200,
    correlatives: toCorrelatives({}),
    plannedAfterYear: 4,
  },
];
