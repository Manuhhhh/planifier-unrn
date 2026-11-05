import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Rect, Size } from "../guideLayout.ts";
import { placeCard, placeCenteredCard, spotlightFor } from "../guideLayout.ts";
import type { GuideStep } from "../guideSteps.ts";
import { useGuideTarget } from "../hooks/useGuideTarget.ts";
import { Close } from "./icons.tsx";
import { Button, IconButton, mutedClass } from "./ui.tsx";

interface Props {
  steps: GuideStep[];
  onExit: () => void;
}

/**
 * Plays a step-by-step tour over the real page: a dimmed backdrop with a spotlight hole around
 * each step's `target`, and a card with its text and Atrás/Siguiente. Generic over any `steps`.
 */
export function GuideOverlay({ steps, onExit }: Props) {
  const [index, setIndex] = useState(0);
  const step = steps[index]!;
  const isLast = index === steps.length - 1;
  const targetRect = useGuideTarget(step.target, true);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardSize, setCardSize] = useState<Size>({ width: 288, height: 160 });

  useLayoutEffect(() => {
    const element = cardRef.current;
    if (element) setCardSize({ width: element.offsetWidth, height: element.offsetHeight });
  }, [index, targetRect]);

  const next = () => (isLast ? onExit() : setIndex((value) => value + 1));
  const back = () => setIndex((value) => Math.max(0, value - 1));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onExit();
      else if (event.key === "ArrowRight" || event.key === "Enter") next();
      else if (event.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // `next`/`back` close over `index`, so they are recreated every render; listening to `index`
    // directly keeps the handler current without redeclaring the functions in this array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, isLast, onExit]);

  const viewport: Size = { width: window.innerWidth, height: window.innerHeight };
  const spotlight = targetRect ? spotlightFor(rectOf(targetRect)) : undefined;
  const cardPos = spotlight
    ? placeCard(spotlight, viewport, cardSize)
    : placeCenteredCard(viewport, cardSize);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Guía de uso">
      <Dimmer spotlight={spotlight} viewport={viewport} />
      {spotlight && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed rounded-lg ring-2 ring-red-600 transition-all duration-200 dark:ring-red-400"
          style={{
            left: spotlight.x,
            top: spotlight.y,
            width: spotlight.width,
            height: spotlight.height,
          }}
        />
      )}
      <div
        ref={cardRef}
        className="fixed w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-stone-200 bg-white p-4 shadow-2xl transition-all duration-200 dark:border-stone-700 dark:bg-stone-800"
        style={{ left: cardPos.x, top: cardPos.y }}
      >
        <div className="mb-1 flex items-start justify-between gap-2">
          <p className="text-sm font-semibold">{step.title}</p>
          <IconButton
            aria-label="Cerrar guía"
            spin={false}
            onClick={onExit}
            className="-m-1 -mr-1.5 shrink-0"
          >
            <Close />
          </IconButton>
        </div>
        <p className={`mb-3 text-sm ${mutedClass}`}>{step.text}</p>
        <div className="flex items-center justify-between gap-2">
          <span className={`text-xs ${mutedClass}`}>
            {index + 1} / {steps.length}
          </span>
          <div className="flex gap-2">
            {index > 0 && <Button onClick={back}>Atrás</Button>}
            <Button onClick={next}>{isLast ? "Listo" : "Siguiente"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function rectOf(domRect: DOMRect): Rect {
  return { x: domRect.x, y: domRect.y, width: domRect.width, height: domRect.height };
}

/** Four panels around the spotlight hole; a single full-screen panel when there is no target. */
function Dimmer({ spotlight, viewport }: { spotlight: Rect | undefined; viewport: Size }) {
  const common = "fixed bg-black/60 transition-all duration-200";
  if (!spotlight) return <div aria-hidden="true" className={common} style={{ inset: 0 }} />;

  const { x, y, width, height } = spotlight;
  return (
    <>
      <div
        aria-hidden="true"
        className={common}
        style={{ left: 0, top: 0, width: viewport.width, height: Math.max(0, y) }}
      />
      <div
        aria-hidden="true"
        className={common}
        style={{
          left: 0,
          top: y + height,
          width: viewport.width,
          height: Math.max(0, viewport.height - y - height),
        }}
      />
      <div
        aria-hidden="true"
        className={common}
        style={{ left: 0, top: y, width: Math.max(0, x), height }}
      />
      <div
        aria-hidden="true"
        className={common}
        style={{
          left: x + width,
          top: y,
          width: Math.max(0, viewport.width - x - width),
          height,
        }}
      />
    </>
  );
}
