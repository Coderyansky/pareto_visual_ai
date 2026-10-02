"use client";

import clsx from "clsx";
import { scaleLinear, scaleLog } from "d3-scale";
import { select } from "d3-selection";
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import { Maximize2, Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LabelMode } from "@/lib/filters";
import { formatPriceTick } from "@/lib/format";
import { OrgMark } from "@/lib/orgs";
import { priceOf, scoreOf, type PriceMetric, type ScoreMetric } from "@/lib/pareto";
import type { Model } from "@/lib/types";
import { ModelCard } from "./model-card";

const MARGIN = { top: 52, right: 24, bottom: 52, left: 52 };
const TILE = 24;
const MONO_CHAR = { frontier: 6.6, plain: 6.05 };
const LABEL_H = { frontier: 20, plain: 14 };

const PRICE_TITLE: Record<PriceMetric, [long: string, short: string]> = {
  blended: ["Blended price per 1M tokens (3:1 output:input)", "Blended $ / 1M tokens"],
  input: ["Input price per 1M tokens", "Input $ / 1M tokens"],
  output: ["Output price per 1M tokens", "Output $ / 1M tokens"],
};

interface Point {
  model: Model;
  price: number;
  score: number;
  x: number;
  y: number;
  frontier: boolean;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface PlacedLabel extends Box {
  key: string;
  text: string;
  frontier: boolean;
}

const overlaps = (a: Box, b: Box, pad = 2) =>
  a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;

/**
 * Greedy label placement: frontier labels first (highest score first), then the
 * rest. Each label tries eight anchor positions around its point and takes the
 * first that stays inside the plot and clears tiles and already placed labels.
 * Labels that do not fit are dropped (the tile/dot stays interactive), except
 * for the active model, whose label is always shown.
 */
function placeLabels(points: Point[], mode: LabelMode, bounds: Box, activeKey: string | null): PlacedLabel[] {
  if (mode === "none") return [];
  const obstacles: Box[] = points
    .filter((p) => p.frontier)
    .map((p) => ({ x: p.x - TILE / 2, y: p.y - TILE / 2, w: TILE, h: TILE }));
  const inside = (b: Box) =>
    b.x >= bounds.x && b.y >= bounds.y && b.x + b.w <= bounds.x + bounds.w && b.y + b.h <= bounds.y + bounds.h;

  const queue = points
    .filter((p) => p.frontier || mode === "all" || p.model.key === activeKey)
    .sort((a, b) => Number(b.frontier) - Number(a.frontier) || b.score - a.score);

  const placed: PlacedLabel[] = [];
  for (const p of queue) {
    const kind = p.frontier ? "frontier" : "plain";
    const w = p.model.name.length * MONO_CHAR[kind] + (p.frontier ? 12 : 0);
    const h = LABEL_H[kind];
    const r = p.frontier ? TILE / 2 + 4 : 6;
    const candidates: [number, number][] = [
      [p.x - w / 2, p.y - r - h],
      [p.x - w / 2, p.y + r],
      [p.x + r, p.y - h / 2],
      [p.x - r - w, p.y - h / 2],
      [p.x + r * 0.6, p.y - r - h + 2],
      [p.x - r * 0.6 - w, p.y - r - h + 2],
      [p.x + r * 0.6, p.y + r - 2],
      [p.x - r * 0.6 - w, p.y + r - 2],
    ];
    const boxes = candidates.map(([x, y]) => ({ x, y, w, h }));
    const free = boxes.find((b) => inside(b) && !obstacles.some((o) => overlaps(o, b)));
    const chosen = free ?? (p.model.key === activeKey ? (boxes.find(inside) ?? boxes[0]) : null);
    if (!chosen) continue;
    obstacles.push(chosen);
    placed.push({ ...chosen, key: p.model.key, text: p.model.name, frontier: p.frontier });
  }
  return placed;
}

/** Log-scale ticks thinned to 1-2-5 mantissas when the axis would get crowded. */
function priceTicks(scale: { ticks: (n?: number) => number[] }, maxTicks: number): number[] {
  const all = scale.ticks();
  if (all.length <= maxTicks) return all;
  const lead = (v: number) => Math.round(v / 10 ** Math.floor(Math.log10(v) + 1e-9));
  const nice = all.filter((v) => [1, 2, 5].includes(lead(v)));
  if (nice.length <= maxTicks) return nice;
  return all.filter((v) => lead(v) === 1);
}

export function ParetoChart({
  models,
  frontier,
  priceMetric,
  scoreMetric,
  labels,
  showCi,
  hoverKey,
  pinnedKey,
  onHover,
  onPin,
}: {
  models: Model[];
  frontier: Model[];
  priceMetric: PriceMetric;
  scoreMetric: ScoreMetric;
  labels: LabelMode;
  showCi: boolean;
  hoverKey: string | null;
  pinnedKey: string | null;
  onHover: (key: string | null) => void;
  onPin: (key: string | null) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<ZoomBehavior<HTMLDivElement, unknown> | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity);
  const [wheelHint, setWheelHint] = useState(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      setSize({ w, h: w < 640 ? 420 : Math.min(600, Math.max(480, Math.round(w * 0.56))) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const frontierKeys = useMemo(() => new Set(frontier.map((m) => m.key)), [frontier]);

  const data = useMemo(
    () =>
      models
        .map((m) => ({ model: m, price: priceOf(m, priceMetric), score: scoreOf(m, scoreMetric) }))
        .filter((d): d is { model: Model; price: number; score: number } => d.price !== null && d.price > 0),
    [models, priceMetric, scoreMetric],
  );

  const plot = { x: MARGIN.left, y: MARGIN.top, w: size.w - MARGIN.left - MARGIN.right, h: size.h - MARGIN.top - MARGIN.bottom };

  const base = useMemo(() => {
    const prices = data.map((d) => d.price);
    const lows = data.map((d) => (showCi ? Math.min(d.score, d.model.scoreLower) : d.score));
    const highs = data.map((d) => (showCi ? Math.max(d.score, d.model.scoreUpper) : d.score));
    const pMin = prices.length ? Math.min(...prices) : 0.1;
    const pMax = prices.length ? Math.max(...prices) : 10;
    const sMin = lows.length ? Math.min(...lows) : 1000;
    const sMax = highs.length ? Math.max(...highs) : 1500;
    const pad = Math.max(12, (sMax - sMin) * 0.07);
    // Pricier models on the left, cheaper on the right, as on arena.ai.
    const x = scaleLog()
      .domain([pMax * 1.45, pMin / 1.45])
      .range([MARGIN.left, size.w - MARGIN.right]);
    const y = scaleLinear()
      .domain([sMin - pad, sMax + pad])
      .range([size.h - MARGIN.bottom, MARGIN.top]);
    return { x, y };
  }, [data, showCi, size.w, size.h]);

  // Reset zoom whenever the underlying axes change meaning.
  useEffect(() => {
    if (wrapRef.current && zoomRef.current) select(wrapRef.current).call(zoomRef.current.transform, zoomIdentity);
  }, [priceMetric, scoreMetric]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || size.w === 0) return;
    const behavior = d3zoom<HTMLDivElement, unknown>()
      .scaleExtent([1, 24])
      .clickDistance(4)
      // d3's default multiplies ctrl-wheel by 10 for pinch gestures; ctrl/⌘ is our wheel modifier, so tone it down.
      .wheelDelta((e: WheelEvent) => -e.deltaY * (e.deltaMode === 1 ? 0.05 : e.deltaMode ? 1 : 0.002) * (e.ctrlKey ? 3 : 1))
      .extent([
        [MARGIN.left, MARGIN.top],
        [size.w - MARGIN.right, size.h - MARGIN.bottom],
      ])
      .translateExtent([
        [MARGIN.left, MARGIN.top],
        [size.w - MARGIN.right, size.h - MARGIN.bottom],
      ])
      .filter((event: Event) => {
        if (event.type === "wheel") return (event as WheelEvent).ctrlKey || (event as WheelEvent).metaKey;
        if (event.type === "touchstart") return (event as TouchEvent).touches.length > 1;
        if (event.type === "dblclick") return false;
        return (event as MouseEvent).button === 0;
      })
      .on("zoom", (e) => setTransform(e.transform));
    zoomRef.current = behavior;
    const sel = select(el).call(behavior);
    // Keep one-finger vertical page scrolling on touch screens; pinch still zooms.
    el.style.touchAction = "pan-y";
    return () => {
      sel.on(".zoom", null);
    };
  }, [size.w, size.h]);

  const zoomBy = useCallback((k: number) => {
    if (wrapRef.current && zoomRef.current) select(wrapRef.current).call(zoomRef.current.scaleBy, k);
  }, []);
  const resetZoom = useCallback(() => {
    if (wrapRef.current && zoomRef.current) select(wrapRef.current).call(zoomRef.current.transform, zoomIdentity);
  }, []);

  const xs = useMemo(() => transform.rescaleX(base.x), [transform, base.x]);
  const ys = useMemo(() => transform.rescaleY(base.y), [transform, base.y]);

  const points: Point[] = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        x: xs(d.price),
        y: ys(d.score),
        frontier: frontierKeys.has(d.model.key),
      })),
    [data, xs, ys, frontierKeys],
  );

  const activeKey = hoverKey ?? pinnedKey;
  const placed = useMemo(
    () => (size.w ? placeLabels(points, labels, plot, activeKey) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [points, labels, size.w, size.h, activeKey],
  );

  const frontierPoints = useMemo(
    () => points.filter((p) => p.frontier).sort((a, b) => a.price - b.price),
    [points],
  );

  const stepPath = useMemo(() => {
    if (!frontierPoints.length) return null;
    const [first, ...rest] = frontierPoints;
    let line = `M${first.x},${first.y}`;
    for (const p of rest) line += `H${p.x}V${p.y}`;
    line += `H${MARGIN.left}`;
    const area = `${line}V${size.h - MARGIN.bottom}H${first.x}Z`;
    return { line, area };
  }, [frontierPoints, size.h]);

  const xTicks = useMemo(() => priceTicks(xs, Math.max(3, Math.floor(plot.w / 64))), [xs, plot.w]);
  const yTicks = useMemo(() => ys.ticks(size.h < 450 ? 5 : 7), [ys, size.h]);

  const active = activeKey ? points.find((p) => p.model.key === activeKey) : undefined;
  const zoomed = transform.k !== 1 || transform.x !== 0 || transform.y !== 0;

  const onWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) return;
    setWheelHint(true);
    clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setWheelHint(false), 1100);
  };

  return (
    <div className="relative">
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1">
        <span className="mr-1 hidden items-center gap-1 rounded-full px-2 text-[11px] text-muted-foreground sm:inline-flex">
          <kbd className="rounded bg-black/[0.04] px-1 font-mono text-[10px] ring-1 ring-black/10 ring-inset">⌘</kbd>
          + scroll to zoom · drag to pan
        </span>
        <ChartButton title="Zoom in" onClick={() => zoomBy(1.6)}>
          <Plus className="size-3.5" />
        </ChartButton>
        <ChartButton title="Zoom out" onClick={() => zoomBy(1 / 1.6)}>
          <Minus className="size-3.5" />
        </ChartButton>
        <ChartButton title="Reset view" onClick={resetZoom} disabled={!zoomed}>
          <Maximize2 className="size-3" />
        </ChartButton>
      </div>

      <div
        ref={wrapRef}
        onWheel={onWheel}
        onClick={(e) => {
          if (e.target === e.currentTarget || (e.target as Element).tagName === "svg") onPin(null);
        }}
        className="dot-grid relative cursor-grab overflow-hidden select-none active:cursor-grabbing"
        style={{ height: size.h || 480 }}
      >
        {size.w > 0 && (
          <svg width={size.w} height={size.h} className="absolute inset-0">
            <defs>
              <clipPath id="plot-clip">
                <rect x={plot.x} y={plot.y - 4} width={plot.w} height={plot.h + 4} />
              </clipPath>
            </defs>

            {yTicks.map((t) => (
              <g key={`y${t}`} transform={`translate(0,${ys(t)})`}>
                <line x1={plot.x} x2={plot.x + plot.w} stroke="rgba(0,0,0,0.06)" />
                <text x={plot.x - 10} dy="0.32em" textAnchor="end" className="fill-muted-foreground font-mono text-[11px] tabular-nums">
                  {t}
                </text>
              </g>
            ))}
            {xTicks.map((t) => (
              <g key={`x${t}`} transform={`translate(${xs(t)},0)`}>
                <line y1={plot.y} y2={plot.y + plot.h} stroke="rgba(0,0,0,0.045)" />
                <text y={plot.y + plot.h + 18} textAnchor="middle" className="fill-muted-foreground font-mono text-[11px] tabular-nums">
                  {formatPriceTick(t)}
                </text>
              </g>
            ))}
            <line x1={plot.x} x2={plot.x + plot.w} y1={plot.y + plot.h} y2={plot.y + plot.h} stroke="rgba(0,0,0,0.12)" />

            <text x={plot.x + plot.w / 2} y={size.h - 10} textAnchor="middle" className="fill-muted-foreground text-[11.5px]">
              {PRICE_TITLE[priceMetric][size.w < 560 ? 1 : 0]}
              <tspan className="fill-foreground/50">{"  ·  cheaper →"}</tspan>
            </text>
            <text x={plot.x - 44} y={plot.y + plot.h / 2} transform={`rotate(-90 ${plot.x - 44} ${plot.y + plot.h / 2})`} textAnchor="middle" className="fill-muted-foreground text-[11.5px]">
              {scoreMetric === "lower" ? "Arena score (95% CI lower bound)" : "Arena score"}
            </text>

            <g clipPath="url(#plot-clip)">
              {stepPath && (
                <>
                  <path d={stepPath.area} fill="rgba(0,0,0,0.028)" />
                  <path d={stepPath.line} fill="none" stroke="#1d1d1f" strokeWidth={1.5} strokeLinejoin="round" />
                </>
              )}

              {showCi &&
                points.map((p) => {
                  const lo = ys(p.model.scoreLower);
                  const hi = ys(p.model.scoreUpper);
                  const strong = p.frontier || p.model.key === activeKey;
                  return (
                    <g key={`ci${p.model.key}`} stroke={strong ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.14)"}>
                      <line x1={p.x} x2={p.x} y1={hi} y2={lo} />
                      <line x1={p.x - 3} x2={p.x + 3} y1={hi} y2={hi} />
                      <line x1={p.x - 3} x2={p.x + 3} y1={lo} y2={lo} />
                    </g>
                  );
                })}

              {points
                .filter((p) => !p.frontier)
                .map((p) => {
                  const isActive = p.model.key === activeKey;
                  return (
                    <g
                      key={p.model.key}
                      className="cursor-pointer"
                      onMouseEnter={() => onHover(p.model.key)}
                      onMouseLeave={() => onHover(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onPin(pinnedKey === p.model.key ? null : p.model.key);
                      }}
                    >
                      <circle cx={p.x} cy={p.y} r={10} fill="transparent" />
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={isActive ? 6 : 4.5}
                        fill={isActive ? "#1d1d1f" : "#8e8e93"}
                        fillOpacity={isActive ? 1 : 0.5}
                        stroke={isActive ? "#fff" : "none"}
                        strokeWidth={2}
                        className="transition-[r] duration-150"
                      />
                    </g>
                  );
                })}
            </g>
          </svg>
        )}

        {/* HTML layer: frontier tiles and labels (crisp text, ring styling). */}
        <div
          className="pointer-events-none absolute overflow-hidden"
          style={{ left: plot.x, top: plot.y - 4, width: Math.max(0, plot.w), height: Math.max(0, plot.h + 4) }}
        >
          <div className="absolute" style={{ left: -plot.x, top: -(plot.y - 4) }}>
            {placed.map((l) => (
              <span
                key={`l${l.key}`}
                className={clsx(
                  "absolute flex items-center font-mono whitespace-nowrap transition-colors duration-150",
                  l.frontier
                    ? "rounded-md bg-white/95 px-1.5 text-[11px] text-foreground/85 ring-1 ring-black/[0.1] ring-inset"
                    : "text-[10px] text-muted-foreground [text-shadow:0_0_3px_#fff,0_0_3px_#fff]",
                  l.key === activeKey && "text-foreground ring-black/30",
                )}
                style={{ left: l.x, top: l.y, height: l.h }}
              >
                {l.text}
              </span>
            ))}
            {frontierPoints.map((p) => {
              const isActive = p.model.key === activeKey;
              return (
                <button
                  key={`t${p.model.key}`}
                  type="button"
                  aria-label={p.model.name}
                  onMouseEnter={() => onHover(p.model.key)}
                  onMouseLeave={() => onHover(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPin(pinnedKey === p.model.key ? null : p.model.key);
                  }}
                  className={clsx(
                    "pointer-events-auto absolute flex items-center justify-center rounded-[8px] transition-[background-color,color,transform] duration-150",
                    isActive
                      ? "z-10 scale-110 bg-foreground text-white ring-1 ring-foreground"
                      : "bg-white text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.14] ring-inset hover:ring-black/30",
                  )}
                  style={{ left: p.x - TILE / 2, top: p.y - TILE / 2, width: TILE, height: TILE }}
                >
                  <OrgMark org={p.model.org} size={13} />
                </button>
              );
            })}
          </div>
        </div>

        {active && <Tooltip point={active} size={size} pinned={pinnedKey === active.model.key} onClose={() => onPin(null)} />}

        {data.length === 0 && size.w > 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-[13px] text-muted-foreground">
            No priced models match these filters.
          </div>
        )}

        <div
          className={clsx(
            "pointer-events-none absolute inset-0 flex items-center justify-center bg-white/40 transition-opacity duration-300",
            wheelHint ? "opacity-100" : "opacity-0",
          )}
        >
          <span className="rounded-full bg-foreground px-3 py-1.5 text-[12px] text-white">
            Hold <kbd className="font-mono">⌘</kbd> or <kbd className="font-mono">Ctrl</kbd> and scroll to zoom
          </span>
        </div>
      </div>
    </div>
  );
}

function ChartButton({
  children,
  title,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex size-7 items-center justify-center rounded-full bg-white/90 text-foreground/85 ring-1 ring-black/[0.1] ring-inset backdrop-blur transition-colors hover:bg-black/[0.04] disabled:opacity-40"
    >
      {children}
    </button>
  );
}

const TOOLTIP_W = 264;

function Tooltip({
  point,
  size,
  pinned,
  onClose,
}: {
  point: Point;
  size: { w: number; h: number };
  pinned: boolean;
  onClose: () => void;
}) {
  const gap = 18;
  const right = point.x + gap + TOOLTIP_W <= size.w - 8;
  const left = right ? point.x + gap : Math.max(8, point.x - gap - TOOLTIP_W);
  const top = Math.min(Math.max(8, point.y - 90), size.h - 236);
  return (
    <div
      className={clsx("absolute z-30", pinned ? "pointer-events-auto" : "pointer-events-none")}
      style={{ left, top, width: TOOLTIP_W }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <ModelCard model={point.model} frontier={point.frontier} onClose={pinned ? onClose : undefined} />
    </div>
  );
}
