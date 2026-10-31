import type { Course, StudyPlan } from "planner";
import { newId, sanitizePlan } from "./storage.ts";

const APP = "planifier-unrn";
const VERSION = 1;

/** Largest file the importer reads; a real plan is a few kilobytes. */
export const MAX_PLAN_FILE_BYTES = 1_000_000;

export type ImportResult =
  | { ok: true; plan: StudyPlan; dropped: number }
  | { ok: false; error: string };

/** The plan as a portable JSON document; the id stays behind so an import never collides. */
export function serializePlan(plan: StudyPlan): string {
  const { name, startYear, startTerm, approved, terms, active, failed } = plan;
  const document = {
    app: APP,
    version: VERSION,
    // Left out when nothing failed, so the file is the same as before failed courses existed.
    plan: { name, startYear, startTerm, approved, terms, ...(failed && { failed }), active },
  };
  return JSON.stringify(document, null, 2);
}

/** The plan name as a safe file name stem. */
export function planSlug(plan: StudyPlan): string {
  const slug = plan.name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "plan";
}

export const planFileName = (plan: StudyPlan) => `${planSlug(plan)}.planificador.json`;

const countCodes = (raw: Record<string, unknown>): number =>
  (Array.isArray(raw.approved) ? raw.approved.length : 0) +
  (Array.isArray(raw.terms)
    ? raw.terms.reduce((sum, term) => sum + (Array.isArray(term) ? term.length : 0), 0)
    : 0);

/** Reads an exported file into a new plan (fresh id); `dropped` counts courses that were discarded. */
export function parsePlanFile(text: string, curriculum: readonly Course[]): ImportResult {
  const invalid: ImportResult = { ok: false, error: "El archivo no es un plan exportado válido." };

  let document: unknown;
  try {
    document = JSON.parse(text);
  } catch {
    return invalid;
  }
  if (document === null || typeof document !== "object") return invalid;
  const { app, version, plan: raw } = document as Record<string, unknown>;
  if (app !== APP || raw === null || typeof raw !== "object") return invalid;
  if (version !== VERSION) {
    return { ok: false, error: "El archivo viene de una versión que esta app no entiende." };
  }

  const known = new Set(curriculum.map((course) => course.code));
  const plan = sanitizePlan({ ...raw, id: newId() }, known);
  if (plan === undefined) return invalid;

  const kept = plan.approved.length + plan.terms.reduce((sum, term) => sum + term.length, 0);
  return {
    ok: true,
    plan: { ...plan, name: plan.name.slice(0, 40) },
    dropped: countCodes(raw as Record<string, unknown>) - kept,
  };
}
