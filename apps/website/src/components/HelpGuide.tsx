import { useCallback, useRef, useState } from "react";
import { GUIDE_STEPS } from "../guideSteps.ts";
import { useDismiss } from "../hooks/useDismiss.ts";
import { useHelpSeen } from "../hooks/useHelpSeen.ts";
import { Callout } from "./Callout.tsx";
import { GuideOverlay } from "./GuideOverlay.tsx";
import { HelpCircle } from "./icons.tsx";
import { Button } from "./ui.tsx";

/** Help button next to Preferencias: a first-visit hint, and an interactive tour of the planner. */
export function HelpGuide() {
  const [touring, setTouring] = useState(false);
  const [seen, markSeen] = useHelpSeen();
  const root = useRef<HTMLDivElement>(null);

  useDismiss(root, !seen, markSeen);

  const startTour = useCallback(() => {
    setTouring(true);
    if (!seen) markSeen();
  }, [seen, markSeen]);

  return (
    <div ref={root} className="relative shrink-0">
      <Button
        data-guide="help-button"
        onClick={startTour}
        aria-haspopup="dialog"
        aria-expanded={touring}
        className="flex items-center gap-2"
      >
        <HelpCircle />
        <span className="max-sm:sr-only">Guía</span>
      </Button>

      <Callout
        open={!seen}
        title="¿Primera vez por aquí?"
        message="Tocá «Guía» cuando quieras para que te muestre, paso a paso, cómo armar tu plan."
        onDismiss={markSeen}
      />

      {touring && <GuideOverlay steps={GUIDE_STEPS} onExit={() => setTouring(false)} />}
    </div>
  );
}
