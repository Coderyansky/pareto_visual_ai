"use client";

import { useEffect, useMemo, useState } from "react";
import type { Range } from "@/lib/filters";

const STEPS = 1000;

/**
 * Dual-thumb range slider over `[min, max]`, optionally on a log scale (prices,
 * context length). `value` null means the full extent. Emits null again when
 * both thumbs return to the ends, so untouched filters stay out of the URL.
 */
export function RangeSlider({
  label,
  min,
  max,
  value,
  onChange,
  format,
  log = false,
  integer = false,
}: {
  label: string;
  min: number;
  max: number;
  value: Range | null;
  onChange: (v: Range | null) => void;
  format: (v: number) => string;
  log?: boolean;
  integer?: boolean;
}) {
  const scale = useMemo(() => {
    const useLog = log && min > 0;
    const lo = useLog ? Math.log(min) : min;
    const hi = useLog ? Math.log(max) : max;
    const span = hi - lo || 1;
    return {
      toPos: (v: number) => Math.round((((useLog ? Math.log(Math.max(v, min)) : v) - lo) / span) * STEPS),
      fromPos: (p: number) => {
        const raw = lo + (p / STEPS) * span;
        const v = useLog ? Math.exp(raw) : raw;
        return integer ? Math.round(v) : v;
      },
    };
  }, [min, max, log, integer]);

  const external: [number, number] = value
    ? [scale.toPos(value[0]), scale.toPos(value[1])]
    : [0, STEPS];
  const [pos, setPos] = useState(external);
  useEffect(() => setPos(external), [external[0], external[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  const commit = (next: [number, number]) => {
    setPos(next);
    if (next[0] <= 0 && next[1] >= STEPS) onChange(null);
    else onChange([next[0] <= 0 ? min : scale.fromPos(next[0]), next[1] >= STEPS ? max : scale.fromPos(next[1])]);
  };

  const shownLo = pos[0] <= 0 ? min : scale.fromPos(pos[0]);
  const shownHi = pos[1] >= STEPS ? max : scale.fromPos(pos[1]);
  const disabled = min === max;

  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12.5px] font-medium text-foreground">{label}</span>
        <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
          {format(shownLo)} – {format(shownHi)}
        </span>
      </div>
      <div className="relative h-4">
        <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-black/[0.07]" />
        <div
          className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-foreground"
          style={{ left: `${(pos[0] / STEPS) * 100}%`, right: `${100 - (pos[1] / STEPS) * 100}%` }}
        />
        <input
          type="range"
          className="range-input"
          min={0}
          max={STEPS}
          value={pos[0]}
          disabled={disabled}
          aria-label={`${label} minimum`}
          onChange={(e) => commit([Math.min(+e.target.value, pos[1]), pos[1]])}
        />
        <input
          type="range"
          className="range-input"
          min={0}
          max={STEPS}
          value={pos[1]}
          disabled={disabled}
          aria-label={`${label} maximum`}
          onChange={(e) => commit([pos[0], Math.max(+e.target.value, pos[0])])}
        />
      </div>
    </div>
  );
}
