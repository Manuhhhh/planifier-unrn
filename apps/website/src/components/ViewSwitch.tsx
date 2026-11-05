import { Board, Pencil } from "./icons.tsx";

export type View = "edit" | "graph";

const OPTIONS: { value: View; label: string; Icon: typeof Pencil }[] = [
  { value: "edit", label: "Editar", Icon: Pencil },
  { value: "graph", label: "Gráfico", Icon: Board },
];

/** Switches between building the plan and looking at the finished result. */
export function ViewSwitch({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  return (
    <div
      data-guide="view-switch"
      role="group"
      aria-label="Modo de visualización"
      className="flex overflow-hidden rounded-md border border-stone-200 dark:border-stone-700"
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={view === value}
          onClick={() => onChange(value)}
          className={`flex cursor-pointer items-center gap-1.5 px-3 py-1.5 max-md:px-2.5 transition-colors ${
            view === value
              ? "bg-red-100 font-semibold text-red-800 dark:bg-red-950 dark:text-red-200"
              : "bg-white hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700"
          }`}
        >
          <Icon /> {label}
        </button>
      ))}
    </div>
  );
}
