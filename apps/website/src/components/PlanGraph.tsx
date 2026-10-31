import { AnimatePresence } from "motion/react";
import { useCallback, useMemo, useRef, useState } from "react";
import { CURRICULUM } from "planner";
import type { CourseCode, StudyPlan } from "planner";
import { exportInteractive } from "../graph/exportHtml.ts";
import { exportGraph, svgDataUrl } from "../graph/exportImage.ts";
import type { ImageFormat } from "../graph/exportImage.ts";
import { buildPlanGraph } from "../graph/planGraph.ts";
import type { CardBox, GraphRows } from "../graph/planGraph.ts";
import { useDarkMode } from "../hooks/useDarkMode.ts";
import { planSlug } from "../planFile.ts";
import { Download } from "./icons.tsx";
import { LineageDialog } from "./LineageDialog.tsx";
import type { Place } from "./LineageDialog.tsx";
import { Button, problemClass } from "./ui.tsx";

const FORMATS: { value: ImageFormat; label: string }[] = [
  { value: "svg", label: "SVG" },
  { value: "png", label: "PNG" },
  { value: "jpg", label: "JPG" },
];

const ROWS: { value: GraphRows; label: string }[] = [
  { value: "single", label: "Una fila" },
  { value: "split", label: "Varias filas" },
];

/** How much larger than its natural size the board may be drawn on a wide screen. */
const MAX_GROWTH = 1.5;

/** The finished plan as a board, with buttons to save it as an image. */
export function PlanGraph({ plan }: { plan: StudyPlan }) {
  const [rows, setRows] = useState<GraphRows>("split");
  const theme = useDarkMode() ? "dark" : "light";
  const graph = useMemo(
    () => buildPlanGraph(plan, CURRICULUM, { rows, theme }),
    [plan, rows, theme],
  );
  const [focus, setFocus] = useState<CourseCode>();
  const focused = useMemo(
    () =>
      focus === undefined ? undefined : buildPlanGraph(plan, CURRICULUM, { focus, rows, theme }),
    [plan, focus, rows, theme],
  );
  const board = useRef<HTMLDivElement>(null);
  // The course whose chain is open, and where every card was on screen when it was clicked.
  const [opened, setOpened] = useState<{ code: CourseCode; places: Map<CourseCode, Place> }>();
  const close = useCallback(() => setOpened(undefined), []);

  const open = (clicked: CardBox) => {
    const rect = board.current?.getBoundingClientRect();
    if (rect === undefined) return;
    const scale = rect.width / graph.width;
    const placeOf = (card: CardBox): Place => ({
      x: rect.left + card.x * scale,
      y: rect.top + card.y * scale,
      scale,
    });
    // A course on several boards flies from its first one; the clicked card from where it is.
    const places = new Map<CourseCode, Place>();
    for (const card of graph.cards) {
      if (!places.has(card.code)) places.set(card.code, placeOf(card));
    }
    places.set(clicked.code, placeOf(clicked));
    setFocus(undefined);
    setOpened({ code: clicked.code, places });
  };
  const [busy, setBusy] = useState<ImageFormat>();
  const [error, setError] = useState<string>();

  const save = async (format: ImageFormat) => {
    setBusy(format);
    setError(undefined);
    try {
      await exportGraph(graph, planSlug(plan), format);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo exportar la imagen.");
    } finally {
      setBusy(undefined);
    }
  };

  const saveInteractive = () => {
    setError(undefined);
    try {
      exportInteractive(plan, CURRICULUM, rows, planSlug(plan));
    } catch {
      setError("No se pudo exportar la página.");
    }
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-lg font-semibold">Gráfico del plan</h2>
        <div
          role="group"
          aria-label="Correlativas a distancia"
          className="flex overflow-hidden rounded-md border border-stone-200 dark:border-stone-700"
        >
          {ROWS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={rows === value}
              onClick={() => setRows(value)}
              className={`cursor-pointer px-3 py-1.5 text-sm transition-colors ${
                rows === value
                  ? "bg-red-100 font-semibold text-red-800 dark:bg-red-950 dark:text-red-200"
                  : "bg-white hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-sm text-stone-500 dark:text-stone-400">Exportar como</span>
        {FORMATS.map(({ value, label }) => (
          <Button
            key={value}
            disabled={busy !== undefined}
            onClick={() => save(value)}
            className="flex items-center gap-1.5"
          >
            <Download /> {label}
          </Button>
        ))}
        <Button
          onClick={saveInteractive}
          title="Una página web con el gráfico, de solo lectura, con modo claro y oscuro"
          className="flex items-center gap-1.5"
        >
          <Download /> HTML interactivo
        </Button>
      </div>
      {error && (
        <p role="alert" className={`mb-3 text-sm ${problemClass}`}>
          {error}
        </p>
      )}
      {/* An <img> never runs anything inside the SVG, so plan names can't inject markup. */}
      <div className="overflow-auto rounded-lg border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900">
        {/* Grows to fill the panel (up to a limit, so text stays readable) and scrolls when narrow. */}
        <div
          ref={board}
          className="relative mx-auto"
          style={{ width: "100%", minWidth: graph.width, maxWidth: graph.width * MAX_GROWTH }}
          onMouseLeave={() => setFocus(undefined)}
        >
          <img
            src={svgDataUrl(graph.svg)}
            alt={`Gráfico de ${plan.name}`}
            width={graph.width}
            height={graph.height}
            className="block h-auto w-full"
          />
          {/* The focused picture is laid over the plain one, so swapping never flashes an empty box. */}
          {focused && (
            <img
              src={svgDataUrl(focused.svg)}
              alt=""
              aria-hidden
              className="pointer-events-none absolute inset-0 block h-auto w-full"
            />
          )}
          {graph.cards.map((card, index) => (
            <button
              // A course shows up on more than one board, so its code alone is not unique.
              key={`${card.code}-${index}`}
              type="button"
              aria-label={`Ver las correlativas directas de ${card.name}`}
              aria-haspopup="dialog"
              onMouseEnter={() => setFocus(card.code)}
              onFocus={() => setFocus(card.code)}
              onBlur={() => setFocus(undefined)}
              onClick={() => open(card)}
              className="absolute cursor-pointer rounded-lg outline-offset-2 focus-visible:outline-2 focus-visible:outline-stone-900"
              style={{
                left: `${(card.x / graph.width) * 100}%`,
                top: `${(card.y / graph.height) * 100}%`,
                width: `${(card.width / graph.width) * 100}%`,
                height: `${(card.height / graph.height) * 100}%`,
              }}
            />
          ))}
        </div>
      </div>
      <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
        Pasá el cursor sobre una materia para ver sus correlativas, o hacé click para verla aparte
        con las que tiene a un paso.
      </p>
      <AnimatePresence>
        {opened && (
          <LineageDialog
            plan={plan}
            code={opened.code}
            rows={rows}
            theme={theme}
            from={(code) => opened.places.get(code)}
            onClose={close}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
