/** Guaraní code of a course, e.g. "V1283". */
export type CourseCode = string;

/** Cuatrimestre: 1 = first (Mar-Jul), 2 = second (Aug-Dec). */
export type Term = 1 | 2;

export type Year = 1 | 2 | 3 | 4 | 5;

/**
 * Official correlatives (Res. CSDEyVE 015/22, "Mapa de correlatividades").
 * `regular` means "cursada aprobada"; `approved` means the final exam is passed.
 */
export interface Correlatives {
  /** Courses that must be regular (or approved) to enroll. */
  enrollRegular: readonly CourseCode[];
  /** Courses whose final must be approved to enroll. */
  enrollApproved: readonly CourseCode[];
  /** Courses whose final must be approved to sit this course's final. */
  finalApproved: readonly CourseCode[];
}

export interface Course {
  code: CourseCode;
  name: string;
  year: Year;
  /** Cuatrimestres in which the course is offered. */
  terms: readonly Term[];
  /** Null when the plan gives no weekly load (supervised practice). */
  weeklyHours: number | null;
  hours: number;
  correlatives: Correlatives;
  /**
   * Not an official correlative: the course is only coherent once every course up to
   * this year is approved. The official map is silent for the supervised practice, but
   * the plan places it after fourth year.
   */
  plannedAfterYear?: Year;
}

export type CourseStatus = "regular" | "approved";

/** Progress per course; a course without an entry has not been taken. */
export type Progress = Readonly<Record<CourseCode, CourseStatus>>;

/** Why a course cannot be taken with a given progress. */
export type Blocker =
  | { kind: "regular"; code: CourseCode }
  | { kind: "approved"; code: CourseCode }
  | { kind: "year"; year: Year };
