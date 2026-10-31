import { Skeleton, headerClass, mainClass, pageClass, panelClass, shellClass } from "./ui.tsx";

const stepperClass =
  "flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 shadow-sm dark:border-stone-700 dark:bg-stone-800";

/** Placeholder with the same frame as `App`, shown while the app code loads. */
export function AppSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Cargando el planificador"
      className={shellClass}
    >
      <header className={headerClass}>
        <div className="flex items-center gap-3">
          <Skeleton className="size-9" />
          <div>
            <Skeleton className="mb-1.5 h-5 w-48" />
            <Skeleton className="h-3 w-64 max-w-full" />
          </div>
        </div>
        <Skeleton className="h-10 w-32 shrink-0" />
      </header>

      <div className={pageClass}>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-28" />
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <Skeleton className="h-[3.75rem] w-44" />
            <Skeleton className="h-[3.75rem] w-52" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-20" />
            </div>
          </div>
        </div>

        <div className={stepperClass}>
          <Skeleton className="h-10 w-28" />
          <Skeleton className="mx-auto h-5 w-56" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="ml-auto h-6 w-32 rounded-full" />
        </div>

        <main className={mainClass}>
          <section className={panelClass}>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <Skeleton className="h-10 min-w-56 flex-1" />
              <Skeleton className="h-5 w-36" />
            </div>
            <Skeleton className="mb-3 h-6 w-56" />
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} className="h-[3.25rem] w-full" />
              ))}
            </div>
          </section>
          <section className={panelClass}>
            <Skeleton className="mb-3 h-6 w-24" />
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }, (_, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-stone-200 p-3 dark:border-stone-700"
                >
                  <Skeleton className="mb-3 h-5 w-48" />
                  <Skeleton className="mb-2 h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
          </section>
        </main>

        <footer className="mt-3 text-xs">
          <Skeleton className="mb-1.5 h-3 w-full max-w-3xl" />
          <Skeleton className="h-3 w-1/2 max-w-xl" />
        </footer>
      </div>
    </div>
  );
}
