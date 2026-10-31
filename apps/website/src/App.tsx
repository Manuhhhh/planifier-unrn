import { MotionConfig } from "motion/react";
import { useState } from "react";
import { ConfirmProvider } from "./components/Confirm.tsx";
import { CourseList } from "./components/CourseList.tsx";
import { PlanGraph } from "./components/PlanGraph.tsx";
import { PlanPanel } from "./components/PlanPanel.tsx";
import { PlanTabs } from "./components/PlanTabs.tsx";
import { PlanToolbar } from "./components/PlanToolbar.tsx";
import { PreferencesMenu } from "./components/PreferencesMenu.tsx";
import { Header } from "./components/Header.tsx";
import { HoverProvider } from "./components/RelationHover.tsx";
import { Stepper } from "./components/Stepper.tsx";
import { ViewSwitch } from "./components/ViewSwitch.tsx";
import type { View } from "./components/ViewSwitch.tsx";
import {
  Reveal,
  mainClass,
  mutedClass,
  pageClass,
  panelClass,
  shellClass,
} from "./components/ui.tsx";
import { usePlans } from "./hooks/usePlans.ts";
import { usePreferences } from "./hooks/usePreferences.ts";

export function App() {
  const { plans, plan, update, select, add, remove } = usePlans();
  const { preferences, setPreferences } = usePreferences();
  const [query, setQuery] = useState("");
  const [onlyEnabled, setOnlyEnabled] = useState(true);
  const [view, setView] = useState<View>("edit");

  return (
    <MotionConfig reducedMotion={preferences.animations ? "user" : "always"}>
      <ConfirmProvider>
        <HoverProvider plan={plan}>
          <div className={shellClass}>
            <Header>
              <PreferencesMenu preferences={preferences} onChange={setPreferences} />
            </Header>
            <div className={pageClass}>
              <Reveal
                delay={0.08}
                className="relative z-20 mb-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-3"
              >
                <PlanTabs plans={plans} selectedId={plan.id} onSelect={select} onAdd={add} />
                <PlanToolbar
                  plan={plan}
                  canRemove={plans.length > 1}
                  onChange={update}
                  onDuplicate={add}
                  onImport={add}
                  onRemove={remove}
                />
              </Reveal>

              {view === "edit" ? (
                <>
                  <Reveal delay={0.16}>
                    <Stepper plan={plan} onChange={update}>
                      <ViewSwitch view={view} onChange={setView} />
                    </Stepper>
                  </Reveal>

                  <main className={mainClass}>
                    <Reveal delay={0.24} className="min-h-0">
                      <section className={panelClass}>
                        <CourseList
                          plan={plan}
                          query={query}
                          onlyEnabled={onlyEnabled}
                          onQueryChange={setQuery}
                          onOnlyEnabledChange={setOnlyEnabled}
                          onChange={update}
                        />
                      </section>
                    </Reveal>
                    <Reveal delay={0.32} className="min-h-0">
                      <section className={panelClass}>
                        <PlanPanel plan={plan} onChange={update} />
                      </section>
                    </Reveal>
                  </main>
                </>
              ) : (
                <>
                  <Reveal>
                    <div className="flex justify-end">
                      <ViewSwitch view={view} onChange={setView} />
                    </div>
                  </Reveal>
                  <main className={mainClass}>
                    <Reveal delay={0.08} className="min-h-0 md:col-span-2">
                      <section className={panelClass}>
                        <PlanGraph plan={plan} />
                      </section>
                    </Reveal>
                  </main>
                </>
              )}

              <Reveal delay={0.4}>
                <footer className={`mt-3 text-xs ${mutedClass}`}>
                  Se asume que aprobás los finales de cada cuatrimestre antes de empezar el
                  siguiente. Correlatividades según la Res. CSDEyVE 015/22. Pasá el mouse sobre una
                  materia para ver qué necesita y qué habilita.
                </footer>
              </Reveal>
            </div>
          </div>
        </HoverProvider>
      </ConfirmProvider>
    </MotionConfig>
  );
}
