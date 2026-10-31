export type Pane = "courses" | "plan";

/**
 * On a phone the course list and the plan do not fit side by side, so one is shown at a time.
 * This bar picks which, stays at the top while scrolling, and counts the planned courses so
 * adding one from the list is visible even while the plan is out of sight.
 */
export function PaneSwitch({
  pane,
  planned,
  onChange,
}: {
  pane: Pane;
  planned: number;
  onChange: (pane: Pane) => void;
}) {
  const options: { value: Pane; label: string }[] = [
    { value: "courses", label: "Materias" },
    { value: "plan", label: "Tu plan" },
  ];
  return (
    <div
      role="group"
      aria-label="Panel visible"
      className="sticky top-2 z-20 mt-3 flex rounded-xl border border-stone-200 bg-white p-1 shadow-md md:hidden dark:border-stone-700 dark:bg-stone-800"
    >
      {options.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          aria-pressed={pane === value}
          onClick={() => onChange(value)}
          className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
            pane === value
              ? "bg-red-100 font-semibold text-red-800 dark:bg-red-950 dark:text-red-200"
              : "text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-700"
          }`}
        >
          {label}
          {value === "plan" && (
            <span className="min-w-5 rounded-full bg-red-700 px-1.5 text-xs font-semibold leading-5 text-white dark:bg-red-500">
              {planned}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
