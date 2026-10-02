"use client";

import { ReactLenis } from "lenis/react";
import { useSyncExternalStore } from "react";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(REDUCED_MOTION);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/** Lenis smoothed wheel scrolling (lerp 0.1); native scrolling on touch and with reduced motion. */
export function SmoothScroll() {
  const reducedMotion = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => true,
  );
  if (reducedMotion) return null;
  return <ReactLenis root options={{ lerp: 0.1, anchors: true }} />;
}
