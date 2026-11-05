import { useId } from "react";
import type { ReactNode } from "react";
import { headerClass, mutedClass } from "./ui.tsx";

/**
 * The plan as a route: two courses still to take joined by a rising curve to the goal, a starred
 * node. The same drawing is the favicon (public/favicon.svg) and the exported page's mark.
 */
export function BrandMark({ className = "size-9" }: { className?: string }) {
  // Several marks can share a page, so each needs its own gradient id.
  const gradient = useId();
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ef4444" />
          <stop offset="1" stopColor="#991b1b" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gradient})`} />
      <path
        d="M8 23.5C12.5 23.5 13 19.5 16.5 19.5S23.5 15 23.5 8.5"
        fill="none"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="8" cy="23.5" r="2.7" fill="#dc2626" stroke="white" strokeWidth="2" />
      <circle cx="16.5" cy="19.5" r="2.7" fill="#c42727" stroke="white" strokeWidth="2" />
      <circle cx="23.5" cy="8.5" r="4" fill="white" />
      <path
        d="M23.5 6.3l.65 1.55 1.55.65-1.55.65-.65 1.55-.65-1.55-1.55-.65 1.55-.65z"
        fill="#b91c1c"
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
          <h1 className="truncate text-base font-semibold leading-tight md:text-lg">
            Planificador de cursada
          </h1>
          <p className={`truncate text-xs ${mutedClass}`}>
            <span className="max-sm:hidden">UNRN · Licenciatura en Sistemas · Plan 2022</span>
            <span className="sm:hidden">UNRN · Lic. en Sistemas · Plan 2022</span>
          </p>
        </div>
      </div>
      {children}
    </header>
  );
}
