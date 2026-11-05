import { useEffect, useState } from "react";

/**
 * Tracks the bounding rect of the `[data-guide="key"]` element while `active`, scrolling it
 * into view the first time it is found. Returns `undefined` while inactive or not found.
 */
export function useGuideTarget(key: string | undefined, active: boolean): DOMRect | undefined {
  const [rect, setRect] = useState<DOMRect>();

  useEffect(() => {
    if (!active || !key) {
      setRect(undefined);
      return;
    }
    let frame: number;
    let scrolled = false;
    const track = () => {
      const element = document.querySelector(`[data-guide="${key}"]`);
      if (element) {
        if (!scrolled) {
          element.scrollIntoView({ block: "nearest", behavior: "smooth" });
          scrolled = true;
        }
        setRect(element.getBoundingClientRect());
      } else {
        setRect(undefined);
      }
      frame = requestAnimationFrame(track);
    };
    frame = requestAnimationFrame(track);
    return () => cancelAnimationFrame(frame);
  }, [key, active]);

  return rect;
}
