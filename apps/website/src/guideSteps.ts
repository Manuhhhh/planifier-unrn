export interface GuideStep {
  title: string;
  text: string;
  /** `data-guide` value of the element to spotlight; omit for a centered, unanchored step. */
  target?: string;
}

// Content specific to this planner; GuideOverlay (the player) is generic over any GuideStep[].
export const GUIDE_STEPS: GuideStep[] = [
  {
    title: "Así se usa el planificador",
    text: "Te muestro, paso a paso, dónde está cada cosa. Dale «Siguiente» para seguir, o cerrá esto cuando quieras.",
  },
  {
    title: "Buscá materias",
    text: "Escribí acá para buscar por nombre o contenido: entiende sinónimos y no le importan los acentos.",
    target: "course-search",
  },
  {
    title: "«Solo habilitadas»",
    text: "Por defecto solo ves lo que podés cursar ya. Desactivá esto para ver el resto, con lo que le falta a cada una.",
    target: "only-enabled",
  },
  {
    title: "Agregá materias",
    text: "Tocá una materia para sumarla al cuatrimestre actual. Lo que no encaje ahí queda marcado con una advertencia.",
    target: "course-list",
  },
  {
    title: "Movete entre cuatrimestres",
    text: "Con «Anterior» y «Siguiente» recorrés el plan. Un cuatrimestre puede quedar vacío sin problema.",
    target: "stepper",
  },
  {
    title: "Tu plan",
    text: "Acá se va armando: un bloque por cuatrimestre, con lo que agregaste y las horas de cada uno. Si te lleváz una materia, marcala ahí como desaprobada; «Reacomodar» vuelve a planificar desde ese punto.",
    target: "plan-panel",
  },
  {
    title: "Vista de grafo",
    text: "Cambiá a «Gráfico» para ver el plan completo de un vistazo, y exportarlo como imagen o página interactiva.",
    target: "view-switch",
  },
  {
    title: "Preferencias",
    text: "Tema claro, oscuro o del sistema, y animaciones — todo se guarda solo en este navegador.",
    target: "preferences-button",
  },
  {
    title: "Listo",
    text: "Volvés a ver esta guía cuando quieras, tocando este mismo botón.",
    target: "help-button",
  },
];
