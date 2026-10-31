import { SYLLABUS } from "./syllabus.ts";
import type { Course, CourseCode } from "./types.ts";

/**
 * Words that mean roughly the same thing in this curriculum. A query word pulls in the
 * rest of its group, so "nube" finds Cloud Computing and "testing" finds "pruebas".
 */
const CONCEPTS: readonly (readonly string[])[] = [
  [
    "ia",
    "inteligencia",
    "artificial",
    "aprendizaje",
    "automatico",
    "machine",
    "learning",
    "neuronales",
  ],
  ["web", "html", "frontend", "backend", "front", "back", "navegador", "internet"],
  ["nube", "cloud", "virtualizacion", "serverless"],
  ["testing", "test", "tests", "pruebas", "verificacion", "validacion", "calidad"],
  ["seguridad", "auditoria", "riesgos", "criptografia", "forense", "forensia", "peritaje"],
  ["bd", "base", "bases", "datos", "dbms", "sql", "relacional", "relacionales"],
  ["poo", "objetos", "clases", "herencia", "polimorfismo", "orientacion"],
  ["redes", "red", "protocolos", "telefonia", "comunicaciones", "internet"],
  ["gestion", "proyectos", "planificacion", "estimaciones", "metricas", "agil", "ageles"],
  ["matematica", "algebra", "calculo", "estadistica", "probabilidad", "numeros"],
  ["so", "sistemas", "operativos", "procesos", "memoria", "kernel"],
  ["concurrente", "concurrencia", "paralelo", "paralelismo", "hilos"],
  ["algoritmos", "estructuras", "arboles", "grafos", "listas", "complejidad"],
  ["ingles", "english", "idioma"],
  ["tesis", "practica", "pasantia", "profesional"],
];

const STOPWORDS = new Set([
  "de",
  "la",
  "el",
  "los",
  "las",
  "y",
  "en",
  "a",
  "del",
  "un",
  "una",
  "con",
  "para",
  "por",
  "e",
  "o",
  "al",
  "se",
  "su",
  "que",
]);

const NAME_WEIGHT = 3;
const RELATED_WEIGHT = 0.4;
const PREFIX_WEIGHT = 0.6;
/** Results scoring below this share of the best one are noise from a single shared word. */
const RELEVANCE_CUTOFF = 0.25;

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** Light Spanish stemming: just enough to unify plurals and common endings. */
function stem(word: string): string {
  let result = word;
  for (const suffix of [
    "aciones",
    "acion",
    "amientos",
    "amiento",
    "mente",
    "idades",
    "idad",
    "es",
    "s",
  ]) {
    if (result.length - suffix.length >= 4 && result.endsWith(suffix)) {
      result = result.slice(0, -suffix.length);
      break;
    }
  }
  return result;
}

function tokens(text: string): string[] {
  return normalize(text)
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 0 && !STOPWORDS.has(word))
    .map(stem);
}

const conceptGroups = CONCEPTS.map((group) => group.flatMap(tokens));

function weightedQueryTerms(query: string): Map<string, number> {
  const terms = new Map<string, number>();
  const raise = (term: string, weight: number) =>
    terms.set(term, Math.max(terms.get(term) ?? 0, weight));
  for (const term of tokens(query)) {
    raise(term, 1);
    for (const group of conceptGroups) {
      if (group.includes(term)) for (const related of group) raise(related, RELATED_WEIGHT);
    }
  }
  return terms;
}

/**
 * Ranks courses by how well their name and syllabus match the query, understanding
 * accents, word endings, partial words and related concepts. Not an AI model: it works
 * offline on a fixed vocabulary. An empty query returns every course in plan order.
 */
export function searchCourses(query: string, curriculum: readonly Course[]): CourseCode[] {
  const terms = weightedQueryTerms(query);
  if (terms.size === 0) return curriculum.map((course) => course.code);

  const documents = curriculum.map((course) => {
    const weights = new Map<string, number>();
    const add = (word: string, weight: number) =>
      weights.set(word, (weights.get(word) ?? 0) + weight);
    for (const word of tokens(course.name)) add(word, NAME_WEIGHT);
    for (const word of tokens(SYLLABUS[course.code] ?? "")) add(word, 1);
    return { code: course.code, weights };
  });

  // Words that appear in fewer courses say more about a course.
  const idf = (term: string) => {
    const containing = documents.filter(({ weights }) => weights.has(term)).length;
    return Math.log(1 + documents.length / (1 + containing));
  };

  const scored = documents.map(({ code, weights }, position) => {
    let score = 0;
    for (const [term, queryWeight] of terms) {
      const exact = weights.get(term);
      if (exact !== undefined) {
        score += queryWeight * idf(term) * Math.log(1 + exact);
      } else if (term.length >= 3) {
        for (const [word, count] of weights) {
          if (word.startsWith(term))
            score += queryWeight * PREFIX_WEIGHT * idf(word) * Math.log(1 + count);
        }
      }
    }
    return { code, score, position };
  });

  const ranked = scored
    .filter(({ score }) => score > 0)
    .toSorted((a, b) => b.score - a.score || a.position - b.position);
  const best = ranked[0]?.score ?? 0;
  return ranked.filter(({ score }) => score >= best * RELEVANCE_CUTOFF).map(({ code }) => code);
}
