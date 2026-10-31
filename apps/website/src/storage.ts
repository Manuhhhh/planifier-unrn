import { emptyPlan, withFailed } from "planner";
import type { Course, CourseCode, StudyPlan, Term } from "planner";

const KEY = "planifier-unrn:plans:v1";

export interface Store {
  plans: StudyPlan[];
  selectedId: string;
}

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/** First cuatrimestre that has not begun yet. */
export function defaultStart(now = new Date()): { year: number; term: Term } {
  const year = now.getFullYear();
  const month = now.getMonth();
  if (month < 2) return { year, term: 1 };
  return month < 7 ? { year, term: 2 } : { year: year + 1, term: 1 };
}

export function initialStore(): Store {
  const plan = emptyPlan(newId(), "Plan 1", defaultStart());
  return { plans: [plan], selectedId: plan.id };
}

const isTerm = (value: unknown): value is Term => value === 1 || value === 2;

/** Rebuilds a plan from untrusted JSON, dropping anything that is not valid. */
export function sanitizePlan(value: unknown, known: Set<CourseCode>): StudyPlan | undefined {
  if (value === null || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== "string" || !isTerm(raw.startTerm) || !Number.isInteger(raw.startYear)) {
    return undefined;
  }

  const seen = new Set<CourseCode>();
  const codes = (list: unknown): CourseCode[] =>
    (Array.isArray(list) ? list : []).filter((code): code is CourseCode => {
      if (typeof code !== "string" || !known.has(code) || seen.has(code)) return false;
      seen.add(code);
      return true;
    });

  const approved = codes(raw.approved);
  const terms = (Array.isArray(raw.terms) ? raw.terms : []).map(codes);
  if (terms.length === 0) terms.push([]);
  const active = Number.isInteger(raw.active) ? (raw.active as number) : 0;

  // Plans saved before failed courses existed have no such list; a mark needs a planned course.
  const failed = [...new Set(Array.isArray(raw.failed) ? raw.failed : [])].filter(
    (code): code is CourseCode => typeof code === "string" && terms.some((t) => t.includes(code)),
  );

  return withFailed(
    {
      id: raw.id,
      name: typeof raw.name === "string" && raw.name.trim() ? raw.name : "Plan",
      startYear: raw.startYear as number,
      startTerm: raw.startTerm,
      approved,
      terms,
      active: Math.min(Math.max(active, -1), terms.length - 1),
    },
    failed,
  );
}

export function load(curriculum: readonly Course[]): Store {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
    const known = new Set(curriculum.map((course) => course.code));
    const plans = (Array.isArray(saved?.plans) ? saved.plans : [])
      .map((plan: unknown) => sanitizePlan(plan, known))
      .filter((plan: StudyPlan | undefined): plan is StudyPlan => plan !== undefined);
    if (plans.length === 0) return initialStore();
    const selected = plans.find((plan: StudyPlan) => plan.id === saved.selectedId) ?? plans[0];
    return { plans, selectedId: selected.id };
  } catch {
    return initialStore();
  }
}

export function save(store: Store): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // Storage can be unavailable (private mode, quota); the planner still works without it.
  }
}
