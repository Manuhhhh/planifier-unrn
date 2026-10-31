import type { ReactNode } from "react";
import { headerClass, mutedClass } from "./ui.tsx";

/** Three course cards joined by arrows: what the planner draws, as a mark. */
export function BrandMark({ className = "size-9" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className={`shrink-0 ${className}`}>
      <rect width="32" height="32" rx="8" className="fill-red-700 dark:fill-red-600" />
      <g fill="white">
        <rect x="6" y="7" width="8" height="5" rx="1.5" />
        <rect x="6" y="20" width="8" height="5" rx="1.5" />
        <rect x="18" y="13.5" width="8" height="5" rx="1.5" />
      </g>
      <path
        d="M14 9.5C16 9.5 16 16 18 16M14 22.5C16 22.5 16 16 18 16"
        fill="none"
        stroke="white"
        strokeWidth="1.5"
      />
    </svg>
  );
}

/** Top bar of the page: who it is for on the left, `children` (the settings) on the right. */
export function Header({ children }: { children: ReactNode }) {
  return (
    <header className={headerClass}>
      <div className="flex min-w-0 items-center gap-3">
        <BrandMark />
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold leading-tight">Planificador de cursada</h1>
          <p className={`truncate text-xs ${mutedClass}`}>
            UNRN · Licenciatura en Sistemas · Plan 2022
          </p>
        </div>
      </div>
      {children}
    </header>
  );
}
